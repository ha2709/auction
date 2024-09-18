"use strict";

const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const crypto = require("crypto");
const {Auction, notifyAllClients} = require("../utils/index");

// Array to store connected clients' public keys
let connectedClients = [];

// Helper function to parse incoming requests
const parseRequest = (reqRaw) => {
  return JSON.parse(reqRaw.toString("utf-8"));
};
 

const main = async () => {
  // Hyperbee DB initialization
  const hcore = new Hypercore("./db/rpc-server");
  const hbee = new Hyperbee(hcore, {
    keyEncoding: "utf-8",
    valueEncoding: "binary",
  });
  await hbee.ready();

  // Distributed hash table setup
  let dhtSeed = (await hbee.get("dht-seed"))?.value;
  if (!dhtSeed) {
    dhtSeed = crypto.randomBytes(32);
    await hbee.put("dht-seed", dhtSeed);
  }
  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: "127.0.0.1", port: 30001 }],
  });

  // RPC setup
  let rpcSeed = (await hbee.get("rpc-seed"))?.value;
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32);
    await hbee.put("rpc-seed", rpcSeed);
  }
  const rpc = new RPC({ seed: rpcSeed, dht });
  const rpcServer = rpc.createServer();
  await rpcServer.listen();
  console.log(`RPC server started listening on public key: ${rpcServer.publicKey.toString("hex")}`);

  // Instantiate the Auction class with Hyperbee
  const auctionManager = new Auction(hbee);

  // Client Registration Handler
  rpcServer.respond("registerClient", async (reqRaw) => {
    const req = parseRequest(reqRaw);
    const clientPubKey = req.clientPubKey;

    if (!connectedClients.includes(clientPubKey)) {
      connectedClients.push(clientPubKey);
      console.log(`Client registered: ${clientPubKey}`);
    }

    return Buffer.from(JSON.stringify({ status: "registered" }), "utf-8");
  });

  // Auction Opened Handler
  rpcServer.respond("auctionOpened", async (reqRaw) => {
    try {
      const req = parseRequest(reqRaw);
      const { auctionId, auctionDetails, creator, initialPrice } = req;

      if (!auctionId || !auctionDetails) {
        throw new Error("Invalid auction data. Missing auctionId or auctionDetails.");
      }

      const auctionResponse = await auctionManager.createAuction(
        String(auctionId),
        String(auctionDetails),
        String(creator),
        parseFloat(initialPrice)
      );
      return Buffer.from(JSON.stringify(auctionResponse), "utf-8");
    } catch (error) {
      console.error("Error handling auctionOpened:", error);
      return Buffer.from(JSON.stringify({ status: "error", message: error.message }), "utf-8");
    }
  });

  // Bid Handler
  rpcServer.respond("newBid", async (reqRaw) => {
    try {
      const req = parseRequest(reqRaw);
      const { auctionId, bid } = req;

      if (!auctionId || !bid) {
        throw new Error("Invalid bid data. Missing auctionId or bid information.");
      }

      const auctionResponse = await auctionManager.placeBid(String(auctionId), bid);
      return Buffer.from(JSON.stringify(auctionResponse), "utf-8");
    } catch (error) {
      console.error("Error handling newBid:", error);
      return Buffer.from(JSON.stringify({ status: "error", message: error.message }), "utf-8");
    }
  });

  // Auction Closed Handler
  rpcServer.respond("auctionClosed", async (reqRaw) => {
    try {
      const req = parseRequest(reqRaw);
      const { auctionId, callerId } = req;

      if (!auctionId || !callerId) {
        throw new Error("Invalid auction or caller data.");
      }

      const closeResponse = await auctionManager.closeAuction(String(auctionId), String(callerId));

      if (closeResponse.status === "success") {
        await notifyAllClients(rpc, connectedClients, auctionId, "Auction closed", closeResponse.auction);
      }

      return Buffer.from(JSON.stringify(closeResponse), "utf-8");
    } catch (error) {
      console.error("Error handling auctionClosed:", error);
      return Buffer.from(JSON.stringify({ status: "error", message: error.message }), "utf-8");
    }
  });
};

main().catch(console.error);
