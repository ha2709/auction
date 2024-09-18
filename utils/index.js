class Auction {
    constructor(hbee) {
      this.hbee = hbee;  // Hyperbee instance to store auction data
    }
  
    async createAuction(auctionId, auctionDetails) {
      const auction = {
        id: auctionId,
        details: auctionDetails,
        bids: [],
        winner: null
      };
      // Store auction in Hyperbee
      await this.hbee.put(auctionId, JSON.stringify(auction));
      console.log(`Auction created with ID: ${auctionId}`);
    }
  
    async placeBid(auctionId, bid) {
      // Retrieve the auction
      const auctionEntry = await this.hbee.get(auctionId);
      if (!auctionEntry) {
        throw new Error('Auction not found');
      }
  
      // Parse the auction data
      const auction = JSON.parse(auctionEntry.value);
      
      // Add the bid to the auction
      auction.bids.push(bid);
      
      // Update the auction in the database
      await this.hbee.put(auctionId, JSON.stringify(auction));
      console.log(`Bid placed: ${JSON.stringify(bid)}`);
    }
  
    async closeAuction(auctionId) {
      // Retrieve the auction
      const auctionEntry = await this.hbee.get(auctionId);
      if (!auctionEntry) {
        throw new Error('Auction not found');
      }
  
      // Parse the auction data
      const auctionData = JSON.parse(auctionEntry.value);
      
 
    // Find the highest bid
    const highestBid = auctionData.bids.reduce((max, bid) => {
        return bid.amount > max.amount ? bid : max;
    }, auctionData.bids[0]);  // Start with the first bid as the highest bid

    console.log(`Highest bid found: ${JSON.stringify(highestBid)}`);

    // Mark the highest bid as the winner
    const winner = highestBid;

    // Update the auction with the winner
    auctionData.winner = winner;
    await hbee.put(auctionId, JSON.stringify(auctionData));

    console.log(`Auction ${auctionId} closed with winner: ${JSON.stringify(winner)}`);

 
    }
  }
// Export the Auction class
module.exports = Auction;  