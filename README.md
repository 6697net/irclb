# IRC Load Balancer
## Why??
On the kubernetes cluster that we've setup it requires something like this load balancer to set at the edge network and pass connections on to the internal IRC daemon on whatever node it may be running on at the time. Since this is fairly random, and our edge IPs change frequently, we needed this in addition to the other infrastructure that we setup for the network.

## Why not?
If you just want people to connect to a random IRCd when they type in your irc.* address, then you're in the wrong place. This will do that but much more inneffective than just pointing a DNS A-Record to each of your daemons.

# TODO:
* Add non-ssl listener to tell clients to connect to SSL listener.
* Create client buffer before the actual backend server connection instead of just capturing *some* of the lines (Yes I know that's probably bad).
* "Code-Cleanup"