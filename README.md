A simple web app that parses a line-separated text data into a 
list of tasks in WunderList using their 
[REST API](https://developer.wunderlist.com/documentation).

Project is currently hosted at https://wunderlist-parser.herokuapp.com/

## History

### 2016-09-05

* You can now append tasks to existing lists
* Some minor fixes
* Code refactoring

### 2016-06-26 

* Switched to redis for session store 
* Fixed tasks being created in the wrong orde
* Added Bluebird Promises for requests
