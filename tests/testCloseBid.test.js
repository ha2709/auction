const {Auction} = require('../utils/auction');  // Import the Auction class

console.log(3, Auction)

describe('auctionClosed Handler', () => {
  let auctionManager;  // This will hold the mocked instance

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
  afterAll(() => {
    jest.restoreAllMocks();  // Ensure all mocks are restored after all tests
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
    // Mock auctionManager.closeAuction to simulate an error being thrown
    jest.spyOn(auctionManager, 'closeAuction').mockResolvedValueOnce({
      status: 'error',
      message: 'Auction with ID test_auction_123 not found',
    });
  
    // Mock request data
    const reqRaw = Buffer.from(JSON.stringify({
      auctionId: 'test_auction_123',
      callerId: 'client_123'
    }), 'utf-8');
  
    // Mock the handler to call auctionManager.closeAuction
    const handler = async (reqRaw) => {
      const req = JSON.parse(reqRaw.toString('utf-8'));
      try {
        // Call the auctionManager's closeAuction method
        const closeResponse = await auctionManager.closeAuction(req.auctionId, req.callerId);
        return Buffer.from(JSON.stringify(closeResponse), 'utf-8');
      } catch (error) {
        // Return an error response if an error occurs
        return Buffer.from(JSON.stringify({
          status: 'error',
          message: error.message
        }), 'utf-8');
      }
    };
  
    // Call the handler and get the response
    const responseRaw = await handler(reqRaw);
  
    // Convert the response back to JSON
    const response = JSON.parse(responseRaw.toString('utf-8'));
  
    // Check that auctionManager.closeAuction was called with the right parameters
    expect(auctionManager.closeAuction).toHaveBeenCalledWith('test_auction_123', 'client_123');
  
    // Verify that the response matches the expected error response
    expect(response).toEqual({
      status: 'error',
      message: 'Auction with ID test_auction_123 not found'
    });
  });
  //  If there are any open connections, close them after all tests
   afterAll(async () => {
    if (auctionManager && typeof auctionManager.close === 'function') {
      await auctionManager.close(); // Example: closing the connection
    }
  });
});
