# Auction
auction using peer to peer

# Installation 

To clone the project 

`https://github.com/ha2709/auction.git`

I use Node `v18.19.1`

to Run the test

`npx jest`

Run the server first

`node src/server.js`

Then run the peer 

`node src/client.js`


run the bootstrap node:

`hyperdht --bootstrap --host 127.0.0.1 --port 30001`


Your task is to create a simplified P2P auction solution based on Hyperswarm RPC and Hypercores.

With the RPC Client, you should be able to open auctions (e.g. selling a picture for 50 USDt). Upon opening the auction 
your client should notify other parties in ecosystem about the opened auction, that means that every client should 
have also a small RPC Server. Other parties can make a bid on auction by submitting the offer, in this case each bid
should be propagated to all parties in ecosystem. Upon completion of auction the distributed transaction should be 
propagated to all nodes as well.

Sample scenario:
- Client#1 opens auction: sell Pic#1 for 75 USDt
- Client#2 opens auction: sell Pic#2 for 60 USDt
- Client#2 makes bid for Client#1->Pic#1 with 75 USDt
- Client#3 makes bid for Client#1->Pic#1 with 75.5 USDt
- Client#2 makes bid for Client#1->Pic#1 with 80 USDt
- Client#1 closes auction: notifies Client#2, ...Client#..n with information about selling details: Client#2->80 USDt

Requirements:
- Code should be only in Javascript
- Use Hyperswarm RPC for communication between nodes
- Solution must be P2P and not classic client/server architecture
- There's no need for a UI
- If you need to use a database use only Hypercore or Hyperbee

You should not spend more time than 6-8 hours on the task. We know that its probably not possible to complete the task 100% in the given time.

If you don't get to the end, just write up what is missing for a complete implementation of the task. Also, if your implementation has limitation and issues, that's no big deal. Just write everything down and indicate how you could solve them, given there was more time.

Good luck!

## Tips

Useful resources:
- https://www.npmjs.com/package/@hyperswarm/rpc
- https://docs.holepunch.to/building-blocks/hyperbee
- https://docs.holepunch.to/building-blocks/hypercore
- https://docs.holepunch.to/building-blocks/hyperdht
- https://www.npmjs.com/package/hp-rpc-cli

1. Install Hyperswarm and other depedencies
 
 `npm install @hyperswarm/rpc hyperdht hypercore hyperbee crypto`

2. Setting up a DHT network

First, install hyperdht globally to run a bootstrap node:

`npm install -g hyperdht`

then run the bootstrap node:

`hyperdht --bootstrap --host 127.0.0.1 --port 30001`