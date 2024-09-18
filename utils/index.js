'use strict';
 
const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const crypto = require("crypto");
const readline = require("readline");
 
class Auction {
  constructor(hcore, hbee, rpc, dht) {
    this.hcore = hcore;
    this.hbee = hbee;
    this.rpc = rpc;
    this.dht = dht;
  }
 
  async createAuction() {
    const auctionId = crypto.randomBytes(32);
    const auction = {
      id: auctionId,
      bids: [],
      winningBid: null,
    };
    await this.hbee.put(auctionId, auction);
    console.log(`Auction created with ID: ${auctionId.toString("hex")}`);
  }
 
  async placeBid(auctionId, bid) {
    const auction = await this.hbee.get(auctionId);
    if (!auction) {                      // Check if auction exists
      console.log("Auction not found");
      return;
    }
    auction.bids.push(bid);
    await this.hbee.put(auctionId, auction);
    console.log(`Bid placed: ${bid}`);
  }
 
  async closeAuction(auctionId) {
    const auction = await this.hbee.get(auctionId);
    if (!auction) {                      // Check if auction exists
      console.log("Auction not found");
      return;
    }
    auction.winningBid = auction.bids.reduce((winningBid, bid) => {
      if (!winningBid || bid.amount > winningBid.amount) {
        return bid;
      }
      return winningBid;
    });
    await this.hbee.put(auctionId, auction);
    console.log(`Auction closed with winning bid: ${auction.winningBid}`);
  }
}    
 
module.exports = Auction;