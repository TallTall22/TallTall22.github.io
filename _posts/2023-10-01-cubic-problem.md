---
date: 2023-10-01 12:26:40
layout: post
title: Cube with python
subtitle: How to solve cubic with python?
description: python
image: https://res.cloudinary.com/dolc0vg7w/image/upload/v1721988966/waffle_2024/wxhj1okmbkn4jzbtcx7y.webp
category: blog
tags:
  - Python
  - Puzzle
  - Algorithm
author: isaac
math: true
---

Ah, the Rubik's Cube – a childhood favorite that's both simple and oh-so-tricky.
I've spent countless hours fiddling with those colorful squares, attempting to crack the code.
But here's the thing: while I could easily get one side all nice and uniform, as soon as I tried to sort out the rest, it was like a whirlwind of chaos, and my perfect side was a jumble once more.

The Rubik's Cube, with its myriad variations, comes in all sorts of shapes and sizes. But for this blog post, I'm focusing on the classic 3x3 cube.
I'll be diving into the world of Python, exploring the potential moves using nodes and edges, and using that knowledge to conquer the cube. 
It's kind of mind-blowing to think that through programming, we can crack the puzzle that's left many of us stumped.
I mean, if I couldn't quite solve it manually, the fact that code might hold the key is pretty mind-boggling!

Let us first assume there are 6 **Faces** in cube.

* `"F"` is the FRONT face (white when solved)
* `"U"` is the UP face (blue when solved)
* `"R"` is the RIGHT face (red when solved)
* `"L"` is the LEFT face (orange when solved)
* `"D"` is the DOWN face (green when solved)
* `"B"` is the BACK face (yellow when solved)

The **MOVES**  with the cube are annotated as follows:
* `"R"` turn the RIGHT face clockwise by a half-turn
* `"U"` turn the UP face clockwise by a half-turn
* `"L"` turn the LEFT face clockwise by a half-turn
* `"D"` turn the DOWN face clockwise by a half-turn

A **SCRAMBLE** is a suite of moves, such as `"RURLDU"`.

I represent a face by a 4-letter code (for faces with 4 tiles: FRONT, BACK) or a 2-letter code (for faces with 2 tiles).
* Each letter stands for a color: `"R" (red), "G" (green), "B" (blue), "Y" (yellow), "W" (white), "O" (orange)`
* Colors appear in this order: top-left, top-right, bottom-left, bottom-right
* In the solved state, the front face is encoded as `"WWWW"`
* At the end of the `"R"` move, the front face is encoded as `"WYWY"`
* If the `"Z"` tile was colored Red, the encoding after the move `"L"` would be `YWYR`

I represent a cube as a dictionary:
* Keys are 1-letter code for the faces (see above)
* values are 2- or 4-letter code for the colors

This dictionary can be turned into a single string:
* concatenate all 4-letter and 2-letter codes, in the following key order: `"FBUDLR"`
* The solved state results in the string `"WWWWYYYYBBGGOORR"`

The moves are represented as position permutations of this string.
* Given a text representation of the dictionary (such as `x = "WWWWYYYYBBGGOORR"`)
* the return value of `apply(x, move="U")` is the string representation of the cube AFTER doing the move `"U"`

There are 2 additional dictionaries:
* `POSSIBLE_MOVES`: a list of moves 
* `MOVE_2_TIME`: a dictionary indicating how long it takes to do a move (not all moves are equal, some are easier to do than others)

## TODO
* `solved_cube` returns the dictionary corresponding to the solved cube

* `CubeState` represents one cube in a specific state
  * Here, I used `dataclass`
  * There is one non-mandatory attribute `faces`:
    * it is a dictionary representing the cube.
    * the default value corresponds to the solved cube, as seen on the diagram
    * use the argument `default_factory` of the function `field` to achieve this without the need for `__post_init__`
  * Add the dunder method corresponding to `repr`
    * return the string representation of the dictionary `faces`
  * Add the dunder method corresponding to `hash`
    * return the result of calling the `hash` on the string representation of the dictionary
  * Add a method `move` with one argument: the move to execute (a string) 
    * return a new object `CubeState` with the state of the cube AFTER the move (use the function `apply` as explained above)
    * assume the existence of a function `from_repr` that can generate a CubeState object from its text representation


* A function `from_repr` takes in a text representation of a cube state
  * return a new object `CubeState` with the `faces` dictionary correctly set up


* A class `Cube`, represents a single cube
  * use `dataclass`
  * it has one optional attribute `state` which is a `CubeState`
  * use `default_factory` to have the default `CubeState()` as default value, without using `__post_init__`
  * add a method `move`, which changes the cube's state to the new state AFTER the move, and returns the cube itself
  * add a method `scramble`
    * receives a scramble (see above for description)
    * executes all the moves
    * change the cube's state to the new state AFTER executing all of the moves in the specified order
    * return the cube itself


* `generate_graph`  returns a networkx directed graph
  * This is the graph with all possible states of a cube
  * Nodes in the graph are objects `CubeState`
  * Each edge represents a single move from one state to another, it is directed from a state to the state AFTER the move
  * Each edge has attributes:
    * `move`: the 1-letter code for the move, 
    * `time`: the time it takes to make the move (see description)
    * `turn`: it's always 1
  * In this cube, each move is also its own inverse
  * So `A->"U"->B` means that `B->"U"->A`

Implement the following algorithm for the generation of the graph:
```
Given an empty directed graph G
Given a Stack S that contains the solved state

As long as the stack is not empty:
  get the state on top of the stack: start
  For each possible move:
    get the state after executing the move from start
    if there are already edges (start, after) and (after, start) in the graph:
      go to the next move
    else:
      add the edges (start, after), (after, start) with the proper edge attributes
      add the new state to the stack S

  Return G

```

* Class `Solution`, using `dataclass`,  attributes `moves` (string) and `time` (integer), and no method

* A class `CubeSolver` has one non-init argument `_G` of type networkx directed graph
  * the value of `_G` is the result of calling `generate_graph`
  * Use `default_factory` to avoid having `__post_init__`
  * implement the dunder method for using an object as function `x = CubeSolver(); x(cube_to_solve)`
    * solves the cube by finding the shortest path from the cube's state to the solved state
    * it will have 2 arguments: an object `Cube` that has been scrambled, and a string `minimize`
    * `minimize` indicates which edge attribute should be minimized for the shortest path (should be `"time"` or `"turn"`)
    * returns an object `Solution`:
      * the `moves` is a string indicating which moves to do to solve the cube (e.g. `"URL"`)
      * the `time` indicate the total time for these moves
  * implement a method `max_moves`
    * No argument
    * Returns the maximum shortest path between any pair of nodes in the graph
    * It is called the `diameter` of a graph. It is up to you to locate the networkx function that computes this value
    * For this graph, it should be 4



```python

R = [0,6,2,4,3,5,1,7,8,10,9,11,12,13,15,14]
U = [4,5,2,3,0,1,6,7,9,8,10,11,14,13,12,15]
L = [7,1,5,3,4,2,6,0,11,9,10,8,13,12,14,15]
D = [0,1,6,7,4,5,2,3,8,9,11,10,12,15,14,13]

MOVE_2_PERMUTATION: dict[str, list[int]] = {
    "R": R,
    "U": U,
    "L": L,
    "D": D,
}

POSSIBLE_MOVES = list(MOVE_2_PERMUTATION.keys())

MOVE_2_TIME: dict[str, int] = {
    "R": 1,
    "U": 2,
    "L": 2,
    "D": 3
}

def apply(x: str, move: str) -> str:
    return "".join(x[i] for i in MOVE_2_PERMUTATION[move])

KEY_ORDER = "FBUDLR"

# Version II

from dataclasses import dataclass
from dataclasses import field
from typing import Optional
from collections import defaultdict


def solved_cube():
  solved_cube={
      'F':'WWWW',
      'U':'BB',
      'R':'RR',
      'L':'OO',
      'D':'GG',
      'B':'YYYY'
  }
  return solved_cube



@dataclass
class CubeState:
  faces:dict[str,str]=field(default_factory=solved_cube)

  def __repr__(self)->str:
    result = self.faces['F'] + self.faces['B'] + self.faces['U'] + self.faces['D'] + self.faces['L'] + self.faces['R']
    return str(result)

  def __hash__(self)->int:
    return hash(repr(self))

  def move(self,moving:str):
    my_new=apply(repr(self),moving)
    my_new2=from_repr(my_new).faces
    return CubeState(faces=my_new2)

def from_repr(code:str)->CubeState:
  F=str(code[0:4])
  B=str(code[4:8])
  U=str(code[8:10])
  D=str(code[10:12])
  L=str(code[12:14])
  R=str(code[14:16])
  faces = {
        'F': F,
        'U': U,
        'R': R,
        'L': L,
        'D': D,
        'B': B
    }
  return CubeState(faces=faces)

@dataclass
class Cube:
  state: CubeState = field(default_factory=CubeState)

  def move(self,moving:str):
    my_new=apply(repr(self.state),moving)
    self.state.faces=from_repr(my_new).faces
    return self

  def scramble(self,scramble_move:str):
    scramble_each = [char for char in scramble_move]
    for scrambles in scramble_each:
      self.move(scrambles)
    return self

import networkx as nx
from collections import deque



def generate_graph():
    G = nx.DiGraph()
    S = deque([CubeState()])

    while S:
        start = S.pop()

        for move in POSSIBLE_MOVES:
            after = start.move(move)

            if not G.has_edge(start, after) and not G.has_edge(after, start):
                G.add_edge(start, after, move=move, time=MOVE_2_TIME[move], turn=1)
                G.add_edge(after, start, move=move, time=MOVE_2_TIME[move], turn=1)
                S.append(after)
    return G



@dataclass
class Solution:
  moves:str
  time:int

@dataclass
class CubeSolver:
    _G: nx.DiGraph = field(init=False,default_factory=generate_graph)

    def __call__(self, cube: Cube, minimize: str) -> 'Solution':
        start_state = cube.state
        end_state = CubeState()
        my_shortest=nx.shortest_path(self._G, source=start_state, target=end_state, weight=minimize)
        moves_before_combine = [self._G[u][v]["move"] for u, v in zip(my_shortest, my_shortest[1:])]
        moves = ''.join(moves_before_combine)
        total_time = nx.path_weight(self._G, path=my_shortest, weight="time")
        return Solution(moves=moves, time=total_time)

    def max_moves(self) -> int:
        return nx.diameter(self._G)
```
