class Auction {
  constructor(hbee) {
    this.hbee = hbee;
  }

  async createAuction(auctionId, auctionDetails, creatorId, initialPrice) {
    const auction = {
      id: auctionId,
      details: auctionDetails,
      creator: creatorId,
      initialPrice: initialPrice,
      bids: [],
      winner: null,
    };
    // Store auction in Hyperbee
    await this.hbee.put(auctionId, JSON.stringify(auction));
    console.log(`Auction created with ID: ${auctionId}`);
    return auction;
  }

  async placeBid(auctionId, bid) {
    const auctionEntry = await this.hbee.get(auctionId);
    if (!auctionEntry) {
      throw new Error('Auction not found');
    }

    const auction = JSON.parse(auctionEntry.value);

    // Check if the new bid is higher than the existing highest bid
    if (auction.bids.length > 0) {
      const highestBid = auction.bids.reduce((max, currentBid) => currentBid.price > max.price ? currentBid : max, auction.bids[0]);
      if (bid.price <= highestBid.price) {
        throw new Error('Bid must be higher than the current highest bid');
      }
    }

    auction.bids.push(bid);
    await this.hbee.put(auctionId, JSON.stringify(auction));
    console.log(`Bid placed: ${JSON.stringify(bid)}`);
    return auction;
  }

  async closeAuction(auctionId, callerId) {
    const auctionEntry = await this.hbee.get(auctionId);
    if (!auctionEntry) {
      throw new Error('Auction not found');
    }

    const auction = JSON.parse(auctionEntry.value);

    if (auction.creator !== callerId) {
      throw new Error('Only the creator can close the auction');
    }

    if (auction.bids.length === 0) {
      throw new Error('Auction cannot be closed because there are no bids');
    }

    const highestBid = auction.bids.reduce((max, currentBid) => currentBid.price > max.price ? currentBid : max, auction.bids[0]);
    auction.winner = highestBid;
    await this.hbee.put(auctionId, JSON.stringify(auction));

    console.log(`Auction closed. Winner: ${JSON.stringify(highestBid)}`);
    return auction;
  }
}

module.exports =  { Auction };
