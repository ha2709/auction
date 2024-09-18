const readline = require("readline");
 
 
const peers = [
    // Add peers' public keys (hex) of other clients here for simplicity
    {
      pubKey: Buffer.from(
        "8ebcb4a46623edd4b539d8995275040a3581b8f0d3aafc52991d2c531c566326",
        "hex"
      ),
    },
  ];
  
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
        console.log(`Notified client ${clientPubKeyBuffer.toString("hex")} about auction ${auctionId} closure.`);
      } catch (err) {
        console.error(`Failed to notify client:`, err);
      }
    }
  };
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
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
 
    parseRequest,
    notifyAllClients,
    askQuestion,
    sendRPCRequestToPeers, 
    rl
};
