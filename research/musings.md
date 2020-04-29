
wheras the ECS approach would look like this:

```javascript
const engine = new Engine();

function create_todoitem(title, completed, id) {
    if (id == undefined)
        id = util.uuid()
    let entity_name = `todoitem-${id}`
    let entity = engine.entity(entity_name)
    entity.setComponent('data', {title,  completed, id})
    return entity
}

create_todoitem('make lunch', true)
create_todoitem('wash dishes', false)

engine.system('report', ['data'], (entity, { data }) => {
    let is_or_is_not = data.completed ? 'is' : 'is not'
    console.log(`Todo item ${data.title} ${is_or_is_not} completed`)
});

engine.tick()
```

# Scraps

Games and visualisation simulators typically have thousands of entities each having a position component, and various other attributes expressed as components attached to each entity. There might be a System to move each entity which updates the position component for each entity in one big loop. There might be a System to render each entity to the screen, again, in one big loop.

Its like a OO "thin model" approach where domain model classes have little logic and are mainly data - most of the business logic being separated into a business logic layer. This is in contrast with a "thick model" approach where complex logic resides inside the appropriate domain model classes - which can be difficult to get right. Cross cutting concerns in the latter approach end up in Manager objects or other such abstract inventions - which is OK but can rub some OO critics the wrong way, like Brian Will who deliver scathing [YouTube critiques](https://medium.com/r/?url=https%3A%2F%2Fyoutu.be%2FQM1iUe6IofM) of OO. Actually I'm fascinated and quite open to hearing such arguments - ironically it was in a comment to this video that I heard ECS mentioned as simpler alternative to traditional Object Oriented programming approaches, and which launched this GUI showdown and this article.


## tick

. Though I have found that  - though Itoo much manual work

 We don't need to run the Systems at 30fps or 60fps, we only need to run the System once anything has changed. Hence the calls to `engine.tick()` which run all the Systems again.

 Its a pity we have to trigger this manually, but there is no other way. Sure the jecs ECS framework I used does have an automatic fps setting which can avoid such manual triggering, but even at 1fps its not really an appropriate metaphor for our GUI which needs to run all the Systems only after each specific GUI event, so that's why we have `engine.tick()` calls everywhere.

If you feel like calling tick is too much manual work, then what games tend to do is use the ECS simulator or timer to call tick automatically, periodically at a certain 'frame rate'. I don't recommend doing this for a GUI app because updates don't need to happen that fast.

There's even a lone call to `engine.tick()` at the bottom of the javascript file, which boots everything into motion, populating the GUI via the multiple Systems.

## housekeeping

insert it 

Imagine the problem of generate a list of todos

The problem here is that any variables you use to store intermediate results from a particular System run will typically need to be reset before each run of all Systems (before each tick). Simply initialising a variable is not enough, because that initialisation will only happen once, on application startup. We need to re-initialising a variable used for gathering results *inside a System code block*, so that the initialisation happens each tick.

If you want to store the results of the code which runs in a System, you can say, append to a variable or data structure. For example if we want to gather the list of all todo items into a list, we simply create a variable `todos = []` then place the following code inside a System `todos.push(data)`. After the `engine.tick()` you will have a full list of all the todo entities. Alternatively, you could push the entity component data instead, 

When there is any change to the application, you will need to trigger `engine.tick()` again, in order to re-render the GUI. You will find that `todos` keeps growing. It needs to be reset prior to each `tick`. One way of doing this is to to leverage the `'tick:before'` event - before each run of all Systems, extra commands can be added:


But what System is there that matches one component, and thus will run only once?  
The following technique allows us to create one or more Systems that execute code once, and define those Systems at appropriate points in the pipeline. If you need to initialise a variable before a particular System code block runs, this is the way to do it.

Let's create a single component called `'housekeeping'` which will serve as the trigger for the housekeeping System step.

create one or more Systems matching on them.

the is a trick I came to need

Now we can insert a housekeeping step anywhere in our code like this:

## dirty flag

I have an another ECS app implementation that goes a little further in terms of optimising Systems. I created a component called Dirty which is just an empty class/data structure and meant to act as a tag (or flag). I attach it to any entity that needs processing. Then I adjusted the System queries so that they include Dirty, and because those queries are and based, only dirty entities will get processed. After the Systems run, I remove the Dirty component from all entities.




### Dirty flag - advanced

Whilst the dirty flag Component technique works pretty well, the problem becomes how to we know which entities to mark as dirty and when? Whilst this is often obvious, like in the above example, where we toggle the `completed` attribute and thus the entity becomes dirty - sometimes multiple entities might be indirectly affected by changing the data on an entity. When I ran into this problem I used a technique where I registered dependencies between components being altered and those entities affected e.g.

```python
do = DirtyRelationshipRegistry()
do.add_dependency('data', ['display', 'report-info'])
```

Thus if the 'data' Component was dirty then the 'display' and 'report-info' Components attached to that entity were also dirty.
This approach was implemented in a wxPython version of an ECS project - I didn't bother with this added complexity for the Javascript implementation since I suspect browser optimisations are pretty good, plus I didn't want to clutter the main ideas in this article with extra, unecessary optimisation code. If you are interested in the wxPython implementation, let me know and I'll write up an article about it incl. source code.


## A better query system?

Also, it would be nice to be able to make more complex queries with or logic. As it stands, ECS implementations only support and logic, which means you can ask for all entities with components A and B and C, but you can't do anything more complex than that. If you ask for all components with A then that will work, but be aware that those entities may have other components attached too.

<!-- ![mvc-a-architecture](https://raw.githubusercontent.com/abulka/todomvc-oo/master/docs_root/images/mvca-architecture-gituml.svg?sanitize=true) -->

