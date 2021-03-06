Indoor navigation sandbox
===============

This is a web application to simulate indoor navigation schemes with beacons on a graph-based system. Features include node graph editing, graph path-finding & navigation, signal & sensor simulation, locationing simulation.

This tool is very prototypic, so please open your browser console to see more messages displayed by the sandbox.

##### Table of Contents  
* [Features](#features)  
* [Methods of simulation](#methods-of-simulation)
* [File format](#file-format)

Features
---------------
The sandbox works by enabling once at a time of the various modes to either edit the graph or simulate a navigation.
* Editing:
    * ```v``` or ```p```: add a new node.
        * Physical node is used to represent actual hardware nodes, where virtual node is for arbitrary nodes of the graph.
        * Left-click to place a node on the graph.
    * ```e```: add a new edge.
        * Left-click on two nodes subsequently to create an edge.
        * You cannot create a loop by clicking the same node twice.
    * ```x```: delete an element.
        * Left-click to delete either a node or an edge.
    * ```m```: move a node.
        * Left-click on a node to pick it up, and left-click again to drop it on the new location.
* Simulation:
    * ```f```: find the shortest path between two nodes.
        * No path is created if the nodes are disconnected.
        * Left-click on two nodes subsequently to find the path.
    * ```l```: locate the user.
        * User actual is displayed as bigger red triangle.
        * User accuracy is displayed as smaller orange triangle.
        * Use ```WASD``` to move user actual.
        * Use ```QR``` to rotate user actual.
    * ```n```: on top of locationing, it finds the path to a node and displays the navigation w.r.t the user orientation.
        * Left-click on a node to set it as destination. Clicking other parts of the graph will set the nearest node as destination.
* ```c```: turn off all modes
    * This clears out the mouse from all modes.
    * It will not stop an ongoing simulation.

Methods of simulation
---------------
* Simulating signals
    * There are no actual signal emitters. In other words, the sensoring is not event-based. It is not necessary to have an event-based model for simulating signal emitting and sensoring since we want to keep the sampling at its own pace, without generating useless data in between each sampling.
    * The sandbox simply keeps the readings of sources for later calculation.
    * The sandbox has a scheduled task that counts the distances of all signal sources except those outside a certain bound. The bound is arbitrary, but should be the distance where beacon signal are unreceivable (in reality).
    * The task will then add noise to the distance "actual", which is generated by a gaussian function. The variance of the function is determined by the x-axis inverse of intensity fall-off function in "inverse-squared" form. As a result, the further of a signal source, the larger the noise distribution, hence the less the accuracy.
* Simulating processing readings:
    * The function of noise cancelling simply returns the median of the readings of each signal source.
* Simulating locationing: the sandbox finds the user location by multi-lateration of the stored readings
    * If only one reading: out of luck.
    * If two readings: the sandbox will notify the user to move a little bit to determine the third vector. Locationing with only two readings is badly inaccurate, but won't be way off.
    * If 3+ readings: pick the nearest 3 and trilaterate.
* Navigating:
    * The sandbox shows navigation based on collected user accuracy and calculated path.
    * User accuracy is assumed to be a unit vector, where angle is the user orientation. Path vector is simply the edge to the next node with a direction.
    * The navigation, w.r.t the user, is then determined by subtracting the two vectors.


File format
---------------
The application saves to and reads in a simple text file in ```JSON``` format. The structure of the object is as following:
```
{
	"Building":{
		"name":"Awesome building",
		"id":"0",
		"UID":"1"
		},
	"Floors":[
		{
			"id":"0",
			"name":"Good floor",
			"alpha":0,
			"scale":[10,1]
		},
		...
	],
	"Nodes":[
		{
			"GID":"0",
			"Coords":[90,100],
			"Vectors":["001"],
			"Type":"PHYSICAL_NODE",
			"PID":"0",
			"Floor":"0"
		},
		...
	]
}
```
