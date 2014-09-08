Indoor navigation sandbox
===============

This is a web application to simulate indoor navigation schemes on a graph-based system.

This tool is very prototypic, so please open your browser console to see more messages displayed by the sandbox.

##### Table of Contents  
* [Features](#features)  
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
