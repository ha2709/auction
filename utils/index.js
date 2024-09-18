class Auction {
  constructor(hbee) {
    this.hbee = hbee; // Hyperbee instance to store auction data
  }

  async createAuction(auctionId, auctionDetails, creatorId, initialPrice) {
    const auction = {
      id: auctionId,
      details: auctionDetails,
      creator: creatorId, // Store the creator of the auction
      initialPrice: initialPrice,
      bids: [],
      winner: null,
    };
    // Store auction in Hyperbee
    await this.hbee.put(auctionId, JSON.stringify(auction));
    console.log(`Auction created with ID: ${auctionId}`);
    // Return the auction data as a JSON object
    return {
      status: "success",
      message: "Auction created successfully",
      auction: {
        id: auctionId,
        details: auctionDetails,
        creator: creatorId,
        initialPrice: initialPrice,
        bids: [],
        winner: null,
      },
    };
  }

  async placeBid(auctionId, bid) {
    try {
      // Retrieve the auction
      const auctionEntry = await this.hbee.get(auctionId);
      if (!auctionEntry) {
        return {
          status: "error",
          message: `Auction with ID ${auctionId} not found`,
        };
      }

      // Parse the auction data
      const auction = JSON.parse(auctionEntry.value);

      // Check if the new bid is higher than the initial price or the current highest bid
      let highestBidPrice = auction.initialPrice;

      if (auction.bids && auction.bids.length > 0) {
        // Find the current highest bid
        const highestBid = auction.bids.reduce((max, currentBid) => {
          return currentBid.price > max.price ? currentBid : max;
        }, auction.bids[0]);

        highestBidPrice = highestBid.price;
      }

      // Compare the new bid with the highest bid
      if (parseFloat(bid.price) <= parseFloat(highestBidPrice)) {
        console.log(
          `Bid rejected: ${JSON.stringify(
            bid
          )}. The new bid must be higher than the current highest bid or the initial price of ${highestBidPrice} USDt.`
        );
        return {
          status: "faill",
          message: `The new bid must be higher than the current highest bid or the initial price of ${highestBidPrice} USDt`,
          auction: {
            id: auctionId,
            details: auction.details,
            creator: auction.creator,
            initialPrice: auction.initialPrice,
            bids: auction.bids, // Updated list of bids
            winner: auction.winner,
          },
        };
      }
      // Add the bid to the auction
      auction.bids.push(bid);

      // Update the auction in the database
      await this.hbee.put(auctionId, JSON.stringify(auction));
      console.log(`Bid placed: ${JSON.stringify(bid)}`);
      return {
        status: "success",
        message: "Bid placed successfully",
        auction: {
          id: auctionId,
          details: auction.details,
          creator: auction.creator,
          initialPrice: auction.initialPrice,
          bids: auction.bids, // Updated list of bids
          winner: auction.winner,
        },
      };
    } catch (error) {
      console.error("Error handling auctionOpened:", error);

      // Return an error response
      return Buffer.from(
        JSON.stringify({
          status: "error",
          message: error.message,
        }),
        "utf-8"
      );
    }
  }

  // Close the auction, only if the caller is the creator
  async closeAuction(auctionId, callerId) {
    try {
      // Retrieve the auction
      const auctionEntry = await this.hbee.get(auctionId);
      if (!auctionEntry) {
        console.log("Auction not found");
        return {
          status: "error",
          message: `Auction with ID ${auctionId} not found`,
        };
      }

      // Parse the auction data
      const auction = JSON.parse(auctionEntry.value);
      console.log(126, auction);
      // Check if the caller is the creator of the auction
        if (auction.creator !== callerId) {
          console.log("Only the creator of the auction can close it.");
          return;
        }

      // Check if there are any bids to select a winner
      if (!auction.bids || auction.bids.length === 0) {
        console.log("Auction cannot be closed as there are no bids.");
        return;
      }

      // Find the highest bid (the winner)
      const winner = auction.bids.reduce((max, currentBid) => {
        return currentBid.price > max.price ? currentBid : max;
      }, auction.bids[0]);
      console.log(143, winner);
      // Set the winner in the auction
      auction.winner = winner;

      // Update the auction in the database
      await this.hbee.put(auctionId, JSON.stringify(auction));
      console.log(
        `Auction ${auctionId} closed. Winner: ${JSON.stringify(winner)}`
      );
      // Return the auction data as a JSON response
      return {
        status: "success",
        message: "Auction closed successfully",
        auction: {
          id: auctionId,
          details: auction.details,
          creator: auction.creator,
          initialPrice: auction.initialPrice,
          bids: auction.bids,
          winner: auction.winner,
        },
      };
    } catch (error) {
      console.error("Error closing auction:", error);
      return {
        status: "error",
        message: error.message,
      };
    }
  }
}

 
const parseRequest = (reqRaw) => {
    return JSON.parse(reqRaw.toString("utf-8"));
  };
  
  
  const notifyAllClients = async (rpc, connectedClients, auctionId, message, auctionData) => {
    for (const clientPubKey of connectedClients) {
      try {
        const payload = Buffer.from(
          JSON.stringify({
            auctionId,
            message,
            auction: auctionData,
          }),
          "utf-8"
        );
        // Convert clientPubKey from string to Buffer if needed
        const clientPubKeyBuffer = Buffer.isBuffer(clientPubKey)
          ? clientPubKey
          : Buffer.from(clientPubKey, "hex");
  
        // Send the notification to the client
        await rpc.request(clientPubKeyBuffer, "auctionClosedNotification", payload);
        console.log(`Notified client ${clientPubKey} about auction ${auctionId} closure.`);
      } catch (err) {
        console.error(`Failed to notify client ${clientPubKey}:`, err);
      }
    }
  };

//  function to ask for input
const askQuestion = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
  };
  
  //  function to send RPC requests to peers
  const sendRPCRequestToPeers = async (rpc, method, payload) => {
    const payloadRaw = Buffer.from(JSON.stringify(payload), "utf-8");
  
    for (const peer of peers) {
      try {
        const responseRaw = await rpc.request(peer.pubKey, method, payloadRaw);
        const response = JSON.parse(responseRaw.toString("utf-8"));
        console.log(`Response from peer ${peer.pubKey.toString("hex")}: ${JSON.stringify(response)}`);
      } catch (error) {
        console.error(`Error sending ${method} request to peer ${peer.pubKey.toString("hex")}:`, error);
      }
    }
  };
// Export the Auction class
module.exports = {
    Auction
    parseRequest,
    notifyAllClients,
    askQuestion,
    sendRPCRequestToPeers
};
