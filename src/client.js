"use strict";

const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const crypto = require("crypto");

const { askQuestion, sendRPCRequestToPeers, rl } = require("../utils/index");
 
const myClientId = crypto.randomBytes(16).toString("hex"); // Generate a unique client ID

const main = async () => {
  // hyperbee db
  const dbPath = `./db/rpc-client-${myClientId}`;
  const hcore = new Hypercore(dbPath);
  const hbee = new Hyperbee(hcore, {
    keyEncoding: "utf-8",
    valueEncoding: "binary",
  });
  await hbee.ready();

  // resolved distributed hash table seed for key pair
  let dhtSeed = (await hbee.get("dht-seed"))?.value;
  if (!dhtSeed) {
    // not found, generate and store in db
    dhtSeed = crypto.randomBytes(32);
    await hbee.put("dht-seed", dhtSeed);
  }

  // start distributed hash table, it is used for rpc service discovery
  const dht = new DHT({
    port: 50001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: "127.0.0.1", port: 30001 }], // note boostrap points to dht that is started via cli
  });

  // public key of rpc server, used instead of address, the address is discovered via dht
  // const serverPubKey = Buffer.from('8ebcb4a46623edd4b539d8995275040a3581b8f0d3aafc52991d2c531c566326', 'hex')

  // rpc lib
  const rpc = new RPC({ dht });

  // Setup RPC server
  const rpcServer = rpc.createServer();
  rpcServer.respond("auctionOpened", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));
    console.log(
      `New auction opened with ID: ${req.auctionId}, Details: ${JSON.stringify(
        req.auctionDetails
      )}`
    );
  });

  rpcServer.respond("newBid", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));
    console.log(
      `New bid submitted for auction ${req.auctionId}: ${req.bid.price} by ${req.bid.bidder}`
    );
  });

  rpcServer.respond("auctionClosed", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));
    console.log(
      `Auction ${req.auctionId} closed with winner: ${JSON.stringify(
        req.winner
      )}`
    );
  });

  // Respond to auctionClosedNotification
  rpcServer.respond("auctionClosedNotification", async (reqRaw) => {
    const req = JSON.parse(reqRaw.toString("utf-8"));
    console.log(
      `Notification: Auction ${req.auctionId} closed with details: ${JSON.stringify(
        req.auction
      )}`
    );
  });
  
  await rpcServer.listen();

  console.log(
    `RPC server listening at: ${rpcServer.publicKey.toString("hex")}`
  );

 
   // Register the client for auctionClosedNotification
   const registerClient = async () => {
    const payload = { clientPubKey: rpcServer.publicKey.toString("hex") };
    await sendRPCRequestToPeers(rpc, "registerClient", payload);
  };

  // Notify peers about auction opening
  const notifyAuctionOpened = async (auctionId, auctionDetails, initialPrice) => {
    const payload = { auctionId, auctionDetails, initialPrice, creator: myClientId };
    await sendRPCRequestToPeers(rpc, "auctionOpened", payload);
  };

  // Submit a bid and notify peers
  const submitBid = async (auctionId, bidPrice) => {
    const payload = { auctionId, bid: { price: bidPrice, bidder: myClientId } };
    await sendRPCRequestToPeers(rpc, "newBid", payload);
  };

  // Close an auction and notify peers
  const closeAuction = async (auctionId) => {
    const payload = { auctionId, callerId: myClientId };
    await sendRPCRequestToPeers(rpc, "auctionClosed", payload);
    console.log(`Auction ${auctionId} closed and result propagated.`);
  };
  // Register the client when the program starts
  await registerClient();

  while (true) {
    const action = await askQuestion(
      "Choose an action: (1) Open Auction, (2) Place Bid, (3) Close Auction , (4) Exit: "
    );

    if (action === "1") {
      // Open Auction
      const auctionDetails = await askQuestion(
        'Enter auction details (e.g., "Selling a picture for 50 USDt"): '
      );
      const auctionId = crypto.randomBytes(16).toString("hex"); // Unique auction ID
      const initialPrice = await askQuestion("Enter the initial price: ");
      await notifyAuctionOpened(
        auctionId,
        auctionDetails,
        parseFloat(initialPrice)
      );
    } else if (action === "2") {
      // Place Bid
      const auctionId = await askQuestion("Enter the auction ID to bid on: ");
      const bidPrice = await askQuestion("Enter your bid price: ");
      await submitBid(auctionId, parseFloat(bidPrice));
    } else if (action === "3") {
      // Close Auction
      const auctionId = await askQuestion("Enter the auction ID to close: ");

      await closeAuction(auctionId);
    }  else if (action === "4") {
      console.log("Exiting...");
      rl.close();
      await rpc.destroy();
      await dht.destroy();
      break;
    } else {
      console.log("Invalid action. Please choose 1, 2, or 3.");
    }
  }
};

main().catch(console.error);
