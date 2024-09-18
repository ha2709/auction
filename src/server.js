'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const Auction = require('../utils/index');
console.log(9, Auction)
const main = async () => {
  // hyperbee db
  const hcore = new Hypercore('./db/rpc-server')
  const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  await hbee.ready()

  // resolved distributed hash table seed for key pair
  let dhtSeed = (await hbee.get('dht-seed'))?.value
  if (!dhtSeed) {
    // not found, generate and store in db
    dhtSeed = crypto.randomBytes(32)
    await hbee.put('dht-seed', dhtSeed)
  }
    // Instantiate the Auction class with Hyperbee
    const auctionManager = new Auction(hbee);
  // start distributed hash table, it is used for rpc service discovery
  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
  })

  // resolve rpc server seed for key pair
  let rpcSeed = (await hbee.get('rpc-seed'))?.value
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32)
    await hbee.put('rpc-seed', rpcSeed)
  }

  // setup rpc server
  const rpc = new RPC({ seed: rpcSeed, dht })
  const rpcServer = rpc.createServer()
  await rpcServer.listen()
  console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))
  // rpc server started listening on public key: 763cdd329d29dc35326865c4fa9bd33a45fdc2d8d2564b11978ca0d022a44a19

  // bind handlers to rpc server
  rpcServer.respond('ping', async (reqRaw) => {
    // reqRaw is Buffer, we need to parse it
    const req = JSON.parse(reqRaw.toString('utf-8'))

    const resp = { nonce: req.nonce + 1 }

    // we also need to return buffer response
    const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8')
    return respRaw
  })

  // Register the 'auctionOpened' handler
  rpcServer.respond('auctionOpened', async (reqRaw) => {
    try {
      const req = JSON.parse(reqRaw.toString('utf-8'))
  
      // Safely convert auctionId and auctionDetails to strings if they exist
      const auctionId = req.auctionId ? String(req.auctionId) : 'unknown_auction_id'
      const auctionDetails = req.auctionDetails ? String(req.auctionDetails) : 'no_details_provided'
  
      console.log(`Auction opened with ID: ${auctionId}, Details: ${auctionDetails}`)
  
      if (auctionId === 'unknown_auction_id' || auctionDetails === 'no_details_provided') {
        throw new Error('Invalid auction data. Missing auctionId or auctionDetails.')
      }
      await auctionManager.createAuction(auctionId, auctionDetails);

  
      // Return a success response
      return Buffer.from(JSON.stringify({ status: 'auction opened', auctionId }), 'utf-8')
    } catch (error) {
      console.error('Error handling auctionOpened:', error)
      return Buffer.from(JSON.stringify({ status: 'error', message: error.message }), 'utf-8')
    }
  })

  rpcServer.respond('newBid', async (reqRaw) => {
    try {
      // Parse the incoming bid request
      const req = JSON.parse(reqRaw.toString('utf-8'))
  
      // Ensure the auctionId and bid exist
      const auctionId = req.auctionId ? String(req.auctionId) : 'unknown_auction_id'
      const bid = req.bid ? req.bid : null
  
      if (auctionId === 'unknown_auction_id' || !bid) {
        throw new Error('Invalid bid data. Missing auctionId or bid information.')
      }
  
      console.log(`Received new bid for auction ${auctionId}: ${bid.amount} by ${bid.bidder}`)
  
      await auctionManager.placeBid(auctionId, bid);
  
       
  
      // Return a success response
      return Buffer.from(JSON.stringify({ status: 'bid placed', auctionId, bid }), 'utf-8')
    } catch (error) {
      console.error('Error handling newBid:', error)
      return Buffer.from(JSON.stringify({ status: 'error', message: error.message }), 'utf-8')
    }
  })
  

  // Register the 'auctionClosed' handler
  rpcServer.respond('auctionClosed', async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString('utf-8'))
    console.log(`Auction ${req.auctionId} closed with winner: ${JSON.stringify(req.winner, null, 2)}`)

    const auctionId = req.auctionId ? String(req.auctionId) : 'unknown_auction_id'
    const winner = req.winner ? req.winner : null
    

    await auctionManager.closeAuction(auctionId, winner);

    return Buffer.from(JSON.stringify({ status: 'auction closed' }), 'utf-8')
  })

}

main().catch(console.error)