const Auction = require('../utils/index');  // Import the Auction class

let auctionManager;  // This will hold the mocked instance

describe('auctionClosed Handler', () => {

  beforeEach(() => {
    // Create a mock instance of Auction class
    auctionManager = new Auction();

    // Mock the closeAuction method
    jest.spyOn(auctionManager, 'closeAuction').mockResolvedValue({
      status: 'success',
      message: 'Auction closed successfully',
      auction: {
        id: 'test_auction_123',
        details: 'Selling test item',
        creator: 'client_123',
        initialPrice: 50,
        bids: [
          { price: 60, bidder: 'client_456' },
          { price: 65, bidder: 'client_789' }
        ],
        winner: { price: 65, bidder: 'client_789' }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();  // Reset mocks after each test
  });

  test('should successfully close an auction and return success response', async () => {
    const reqRaw = Buffer.from(JSON.stringify({
      auctionId: 'test_auction_123',
      callerId: 'client_123'
    }), 'utf-8');

    const handler = jest.fn(async (reqRaw) => {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      const closeResponse = await auctionManager.closeAuction(req.auctionId, req.callerId);
      return Buffer.from(JSON.stringify(closeResponse), 'utf-8');
    });

    const responseRaw = await handler(reqRaw);
    const response = JSON.parse(responseRaw.toString('utf-8'));

    expect(auctionManager.closeAuction).toHaveBeenCalledWith('test_auction_123', 'client_123');
    expect(response).toEqual({
      status: 'success',
      message: 'Auction closed successfully',
      auction: {
        id: 'test_auction_123',
        details: 'Selling test item',
        creator: 'client_123',
        initialPrice: 50,
        bids: [
          { price: 60, bidder: 'client_456' },
          { price: 65, bidder: 'client_789' }
        ],
        winner: { price: 65, bidder: 'client_789' }
      }
    });
  });

  test('should return an error if auctionId or callerId is missing', async () => {
    const reqRaw = Buffer.from(JSON.stringify({
      auctionId: 'test_auction_123',
      // Missing callerId
    }), 'utf-8');

    const handler = jest.fn(async (reqRaw) => {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      if (!req.auctionId || !req.callerId) {
        throw new Error('Invalid auction or caller data.');
      }
      const closeResponse = await auctionManager.closeAuction(req.auctionId, req.callerId);
      return Buffer.from(JSON.stringify(closeResponse), 'utf-8');
    });

    try {
      await handler(reqRaw);
    } catch (error) {
      expect(error.message).toBe('Invalid auction or caller data.');
    }

    expect(auctionManager.closeAuction).not.toHaveBeenCalled();
  });

  test('should handle auctionManager.closeAuction throwing an error', async () => {
    auctionManager.closeAuction.mockRejectedValueOnce(new Error('Something went wrong'));

    const reqRaw = Buffer.from(JSON.stringify({
      auctionId: 'test_auction_123',
      callerId: 'client_123'
    }), 'utf-8');

    const handler = jest.fn(async (reqRaw) => {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      try {
        const closeResponse = await auctionManager.closeAuction(req.auctionId, req.callerId);
        return Buffer.from(JSON.stringify(closeResponse), 'utf-8');
      } catch (error) {
        return Buffer.from(JSON.stringify({
          status: 'error',
          message: error.message
        }), 'utf-8');
      }
    });

    const responseRaw = await handler(reqRaw);
    const response = JSON.parse(responseRaw.toString('utf-8'));

    expect(response).toEqual({
      status: 'error',
      message: 'Something went wrong'
    });

    expect(auctionManager.closeAuction).toHaveBeenCalledWith('test_auction_123', 'client_123');
  });

});
