# Entity Component System • [TodoMVC](http://todomvc.com)

Is the [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system) any good for building traditional GUIs?

It turns out that the answer is yes! Whilst ECS is most commonly used in building games, it can also be used for building a traditional web "form" style application like TodoMVC. However you will need to radically rethink how models, their data and behaviour is organised. 

This is arguably a refreshing, mind-blowing lesson in GUI programming! 🤯😉


![](https://github.com/tastejs/todomvc-app-css/raw/master/screenshot.png)

Live [demo](https://abulka.github.io/todomvc-ecs/index.html).

---

# ECS - Entity Component System Architectural Pattern

The ECS (Entity Component System) architecture is the new hotness in game developer circles. Its a way of architecting your software that rejects Models as classes in favour of a more deconstructed, data driven approach. The results, in gaming apps at least, are massive reductions in complexity and huge increases in performance and maintainability.

> When I read about ECS it got me thinking - why not use it for more traditional software, not just games?

You can read about Entity Systems in this [Wikipedia article](https://medium.com/r/?url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FEntity_component_system). The basic idea is to take the Object (that contains identity, data and behaviour) and 'deconstruct it'.

- Entity = like a model, but *has no data and no behaviour* 🤯 Entities are lightweight and dumb - just an id or name
- Component = data
- System = behaviour

# The freedom to attach any Component to any Entity
You now have the freedom to attach any Component to any Entity. But why bother? 

You would think that a pure data Component like `Position {x:0, y:0}` is always closely tied with a specific Entity - so why break them apart? For example a `Ball` has a Position, a `Person` does not! What a `Person` entity surely needs instead is a `Name {firstname:'John', surname:'Smith'}` etc.

Well, it turns out that the opposite is often true - entities like `Ball`, `Bullet`, `Car` all need `Position`. And in more business oriented applications, `Person`, `Employee`, `Manager` all need a `Name`. 

Thinking further along these lines, another useful component might be `Address` - many Entities would need that. Having a single declaration of `Name` and `Address` etc. saves duplicate declarations and errors.

## What about using Inheritance?

If you think that using class *inheritance* can achieve the goal of declaring `Address` only once - you would be right. However most languages support only single inheritance, so good luck with forcing disparate inhertiance trees to inherit from a common Address class - that's a bit awkward. 

With languages that support multiple inheritance (e.g. Python), you will have more luck - in fact multiple inheritance comes closest to matching the idea of ECS, where you can arbitrarily compose a model entity from as many Component data aspects as you like.  

## What about using Composition?

You could also solve the problem through *composition* - a class could reference a common instance of `Address` and any other common classes it needs. This would also achieve the goal of declaring `Address` only once and providing 'mix and match' composability of Models, that ECS has.

## The ECS solution to composability

The benefit of ECS is that all the logic is in the Systems, and the Component data approach is very composable. 

This freedom to decouple data from entities is very powerful, especially when we take the next and final step in understanding ECS - Systems.

# Systems

Systems are where all the behaviour happens. 
Systems are code blocks which run across subsets of matched Components. 
Here is an example of a two Systems which run one after the other:

```javascript
engine.system('all-entities-with-data-component', ['data'], (entity, { data }) => {
    console.log(`Found entity ${entity} with data ${data}`)
});

engine.system('all-entities-with-data-component-and-dirty-component', ['data', 'dirty'], (entity, { data, dirty }) => {
    console.log(`Found dirty entity ${entity}`)
});
```

## Selecting

Systems are like DOM/CSS Selectors, where you select on one or more Component names.
The system will loop through all components who have all those components (an `and` concept).

## Looping

I guess it comes from the gaming heritage, where there are many game objects to process: looping is central to ECS. 

> If you have an explicit for loop in your code you are probably doing ECS wrong!

Systems magically iterate across entites that match certain Components e.g. all entities who have a Speed component and a Position component. Its like having a CSS selector and running a code block for all matches.

## The tick

When there is any change to the application, you will need to trigger `engine.tick()` again, in order to re-render the GUI. The tick simply re-runs all systems.

ECS systems typically run in a loop (remember, designed for games), which is not appropriate for our GUI. We don't need to run the Systems at 30fps or 60fps, we only need to run the System once anything has changed. Hence the calls to `engine.tick()` which run all the Systems. Its a pity we have to trigger this manually, but there is no other way. Sure the jecs ECS framework I used does have an automatic fps setting which can avoid such manual triggering, but even at 1fps its not really an appropriate metaphor for our GUI which needs to run all the Systems only after each specific GUI event, so that's why we have `engine.tick()` calls everywhere.

If you feel like calling tick is too much manual work, then what games tend to do is use the ECS simulator or timer to call tick automatically, periodically at a certain 'frame rate'. I don't recommend doing this for a GUI app because updates don't need to happen that fast.

There's even a lone call to `engine.tick()` at the bottom of the javascript file, which boots everything into motion, populating the GUI via the multiple Systems.

## Pipeline approach

Games and visualisation simulators typically have thousands of entities each having a position component, and various other attributes expressed as components attached to each entity. There might be a System to move each entity which updates the position component for each entity in one big loop. There might be a System to render each entity to the screen, again, in one big loop.

Its like a OO "thin model" approach where domain model classes have little logic and are mainly data - most of the business logic being separated into a business logic layer. This is in contrast with a "thick model" approach where complex logic resides inside the appropriate domain model classes - which can be difficult to get right. Cross cutting concerns in the latter approach end up in Manager objects or other such abstract inventions - which is OK but can rub some OO critics the wrong way, like Brian Will who deliver scathing [YouTube critiques](https://medium.com/r/?url=https%3A%2F%2Fyoutu.be%2FQM1iUe6IofM) of OO. Actually I'm fascinated and quite open to hearing such arguments - ironically it was in a comment to this video that I heard ECS mentioned as simpler alternative to traditional Object Oriented programming approaches, and which launched this GUI showdown and this article.

Another idea in ECS is that Systems do a very specialised task and write the results back into the ModelRef or PlainData component and then the next System builds on that work to do something else. This is a strength of this ECS architecture, the ability to break down work into easy to understand stages. Of course the render Systems are typically the last System to run and don't write back to the components, they only write to the GUI/DOM.

By having a mix of generic systems and systems that are more choosy about their behaviour based on the values in the components, we arrive at a multi-stage processing pipeline that is centralised and composable.

# Choosing an ECS framework

Entity Component System frameworks are relatively simple. They offer ways of defining Entities, adding Components (data objects) to those entity instances, and defining Systems which are code blocks which run across subsets of matched Components. 

For this project I chose to use the javascript [Jecs](https://www.npmjs.com/package/jecs) library.
The single file jecs.js can be copied into your project and with the usual `<script src="jecs.js"></script>` you are all set to go. Or you can `npm install jecs` and require it in your node projects.

# Example - Traditional Class vs ECS

A traditional class Model of a `Todo` item would look like:

```javascript
class TodoItem {
    constructor(title, completed, id) {
        this.title = title
        this.completed = completed
        this.id = id == undefined ? util.uuid() : id
    }
    report() {
        let is_or_is_not = this.completed ? 'is' : 'is not'
        console.log(`Todo item ${this.title} ${is_or_is_not} completed`)
    }
}

let todos = []
todos.push(new TodoItem('make lunch', true))
todos.push(new TodoItem('wash dishes', false))

todos.forEach(function (todo) {
    todo.report()
})
```

which would generate:

```
$ node example.js 
Todo item make lunch has id 1 and is completed
Todo item wash dishes has id 2 and is not completed
```

wheras the ECS approach would look like this:

```javascript
const engine = new Engine();

engine.entity(util.uuid()).setComponent('data', {title:'make lunch',  completed:true})
engine.entity(util.uuid()).setComponent('data', {title:'wash dishes',  completed:false})

engine.system('report', ['data'], (entity, { data }) => {
    let is_or_is_not = data.completed ? 'is' : 'is not'
    console.log(`Todo item ${data.title} has id ${entity.name} and ${is_or_is_not} completed`)
});
engine.tick()
```

Let's break this down:

1. Creating an entity is just `engine.entity()`
2. Give the entity some data fields with `entity.setComponent('data', {title,  completed, id})`. The name of this component happens to be `'data'` because I chose that name, but I could have named it something like `'todo-data'`
3. Add some behaviour with `engine.system` - the code inside will run *for each* entity that has the `'data'` component.

Notice there is no explicit looping. The System loops for us. All entities who have the 'data' component will be looped through. You can add additional components to the list, which will mean the system will loop through all components who have all those components (an `and` selector).  

You can have multiple systems, they will run in the order declared.  Each time `engine.tick()` is run, all Systems will be run.

Notice there is no need to store a master list of `todos` - the ECS holds all entities for us.  If we did want to generate a list of todos, its actually a bit tricky. See the next section!

# ECS enhancements

I ended up creating a couple of tricks to get ECS to do what I wanted in certain cases.

## Gathering results whilst looping

The problem here is that any variables you use to store intermediate results from a system run, need to reset before each run.

If you want to store the results of the code which runs in a System, you can say, append to a variable or data structure. For example if we want to gather the list of all todo items into a list, we simply create a variable `todos = []` then place the following code inside a System `todos.push(data)`. After the `engine.tick()` you will have a full list of all the todo entities. Alternatively, you could push the entity component data instead, which is what I do to generate the JSON to persist in the browser storage. (Try the live [demo](https://abulka.github.io/todomvc-ecs/index.html) and hit refresh - the same todo items survive, because of this persistence).

When there is any change to the application, you will need to trigger `engine.tick()` again, in order to re-render the GUI. You will find that `todos` keeps growing. It needs to be reset prior to each `tick`. One way of doing this is to to leverage the `'tick:before'` event - before each run of all Systems, extra commands can be added:

```javascript
engine.on('tick:before', (engine) => {
    todos = []  // reset
})
```

If you need to initialise variables in the middle of a system run (remember the order that systems run in is critical, with one system often feeding results into another system) then reseting at the start or beginning won't work.  What we need is System which does the reset or housekeeping tasks, which we can place anywhere in our list of Systems.  But what System is there that matches one component, and thus will run only once?  Let's create a single component called `'housekeeping'` which will serve as the trigger for the housekeeping System step.

```javascript
engine.entity('single-step').setComponent('housekeeping', {})
```

Now we can insert a housekeeping step anywhere in our code like this:

```javascript
engine.system('reset-todos', ['housekeeping'], (entity, { housekeeping }) => {
    this.todos = []
})
```

You can use this technique to insert as many sytems like this as you like, at the appropriate places in your code. I'm not sure if it is kosher ECS usage, but its a technique I found I needed.

Thus the full code for gathering a list of todos is

```javascript
let todos_data = []

engine.system('reset-todo-list', ['housekeeping'], (entity, { housekeeping }) => {
    todos_data = []
});
engine.system('gather-todos-for-save', ['data'], (entity, { data }) => {
    todos_data.push(data)  // or push data.title, or push the entity, or whatever you need
});
engine.system('report-final-result', ['housekeeping'], (entity, { housekeeping }) => {
    console.log('final list of todos', todos_data)
});
engine.tick()
```

## Components as Flags

Systems 'doing stuff' typically means updating component or other data and rendering based on component data. Interestingly, it can even mean *adding and removing components from entities*, which may cause other Systems to run, which hadn't previously been running because entities with the right combination of components that the Systems were looking for did not exist.

For example, my `'think-todoitem'` System decides whether a todo entity needs the GUI DOM `<li>` created or updated, adding either the component `'insert'` or `'update'` to each entity. *Note that the 'insert' and 'update' components have empty data `{}` attached thus the component acts like a flag*.

## Encapsulating Systems into classes

Just because we are deconstructing classes into an ECS approach doesn't mean we can't use classes to help us. 
Systems still work when created inside classes - they are registered with the engine and will run ok.

You might want to use a class to group variables together, so they do not pollute the outer namespaces.

```javascript
class Persistence {
    constructor() {
        this.todos_data = []  // gather this list for persistence purposes, array of pure data dicts

        engine.system('reset-gather-for-save', ['housekeeping'], (entity, { housekeeping }) => {
            this.todos_data = []
        });
        engine.system('gather-todos-for-save', ['data'], (entity, { data }) => {
            this.todos_data.push(data)
        });
        engine.system('save', ['housekeeping'], (entity, { housekeeping }) => {
            this.save()
        });

        save() {
            util.store('todos-oo', this.todos_data)
            console.log('saved', JSON.stringify(this.todos_data))
        }
}
new Persistence()
```

this is arguably nicer and more encapsulated.

The only trick is that you need to instantiate the classes in the correct order, so that their Systems are created (via their constructors) at the appropriate point in the 'pipeline' of Systems.

# Thoughts on ECS

## No Events needed

Whilst there are GUI events from the DOM, notice there are no 'internal' events in this implementation. This is a very real benefit, as event flow can be hard to follow.

The efficiency of the ECS approach is not as good as an event based approach however, because we are re-rendering more than we need to. Internal events give us a finer grained control over what needs to be updated in the GUI. See my [TodoMVC-OO](https://github.com/abulka/todomvc-oo") implementation to see how event notifications from the model to controllers work.

## A dirty flag

Adding a dirty flag to entities that need updating can fix this inefficiency. I'd recommend a Component called `'dirty'` which can be attached to entities. Then refine your Systems to only match on todo data that is dirty e.g.

```javascript
engine.system('process-changed-todoitems', ['data', 'dirty'], (entity, {data, _}) => {
    ... 
    entity.deleteComponent('dirty')
}
```

Notice that the last line of this System *removes* the dirty flag/component.

### Dirty flag - advanced

I have an another ECS app implementation that goes a little further in terms of optimising Systems. I created a component called Dirty which is just an empty class/data structure and meant to act as a tag (or flag). I attach it to any entity that needs processing. Then I adjusted the System queries so that they include Dirty, and because those queries are and based, only dirty entities will get processed. After the Systems run, I remove the Dirty component from all entities.

This works pretty well, but the problem becomes how to we know which entities to mark as dirty and when? You can manually code in calls throughout your code, which is what I initially did. Soon sick of the maintenance that approach required, I moved to a technique where I registered dependencies between components being altered and those entities affected e.g.

```python
do = DirtyObserver(world)

do.add_dependency(ModelRef, [entity_welcome_left, entity_edit_welcome_msg, entity_edit_user_name_msg, entity_edit_user_surname_msg])
do.add_dependency(MultiModelRef, [entity_welcome_user_right])
do.add_dependency("welcome display only, not via model", [entity_welcome_left, entity_welcome_user_right])
do.add_dependency("user display only, not via model", [entity_welcome_user_right])
do.add_dependency("just top right", [entity_welcome_user_right])
```

This approach was implemented in a wxPython version of this project - I didn't bother with this added complexity for the Javascript implementation since I suspect browser optimisations are pretty good, plus I didn't want to clutter the main ideas in this article with extra, unecessary optimisation code. If you are interested in the wxPython implementation, let me know and I'll write up an article about it incl. source code.

# Systems in this Todo app

Systems are where most of the behaviour lives. The idea is that each System is a loop which 'queries' our little database of entities and components and does something with the matching entities and components. I came up with the following Systems, which run in the following order:

| System name | Documentation |
| ----------- | ------------- |
| mark-all-todos-as-complete | Loops through all todo entities and sets `data.complete = true` 
| destroy-completed-todos | Loops through all todo entities and attaches the 'destroy' component if it is complete (see next system which does the actual deletion)
| controller-destroy | Loops through all todo entities that have the 'destroy' component and deletes the GUI and the entity
| housekeeping-resets | Runs once (matches the single 'housekeeping' component), reset various variables incl `todoCount`
| counting | Loops through all todo entities and counts the total number `todoCount` and number completed.
| editing-mode-on | Any entity with the 'editingmode' component will have the GUI element for it go into editing mode. The 'editingmode' component is removed from the entity.
| editing-mode-off | Any entity with the 'editingmode-off' component will have the GUI element for it go out of editing mode and the new todo item title saved in the entitie's `data.title` component. The 'editingmode-off' component is removed from the entity.
| think-todoitem | Decides whether a todo entity needs the GUI DOM `<li>` created or updated, adding either the component `'insert'` or `'update'` to each entity. *Note that the 'insert' and 'update' components have empty data `{}` attached thus the component acts like a flag*.
| controller-update-todoitem | For any entity that has the `'update'` component, updates the GUI with the entity's data. The `'update'` component is then removed from the entity.
| controller-insert-todoitem | For any entity that has the `'insert'` component, created the GUI with the entity's data, and binds the GUI event handlers to javascript functions in our app. The `'insert'` component is then removed from the entity.
| apply-filter | Loops through all todo entities and hides or shows the corresponding GUI element depending on the state of the `app.filter` flag.
| reset-gather-for-save | Runs once (matches the single 'housekeeping' component), reset the `todos_data` list variable ready for the next System
| gather-todos-for-save | For each entity, append its data to the `todos_data` list variable.
| reset-gather-for-save | Runs once (matches the single 'housekeeping' component), saves the `todos_data` list variable data into browser storage.

That's a lot of Systems!  But each System runs after the other, and each one is easy to reason about.  That's the benefit of ECS - its more 'flat' I suppose.

Remember, the systems will only run when you call `engine.tick()`, so don't forget to do that.  When you want all the Systems to run again, simply call `engine.tick()` again.


## TodoMVC-ECS - Conclusion

This approach to wiring up GUI's has been most refreshing. I find the ECS approach fascinating and will be looking for ways to use decoupled Systems in my future projects.

### A better query system?

Also, it would be nice to be able to make more complex queries with or logic. As it stands, ECS implementations only support and logic, which means you can ask for all entities with components A and B and C, but you can't do anything more complex than that. If you ask for all components with A then that will work, but be aware that those entities may have other components attached too.

<!-- ![mvc-a-architecture](https://raw.githubusercontent.com/abulka/todomvc-oo/master/docs_root/images/mvca-architecture-gituml.svg?sanitize=true) -->


---

### Resources

#### Demo

- Running demo [here](https://abulka.github.io/todomvc-ecs/index.html), fully implements the TodoMVC specification.


- Study the final code in this repository, specifically [app.js](https://github.com/abulka/todomvc-ecs/blob/master/js/app.js).

#### ECS
- [Jecs](https://www.npmjs.com/package/jecs) ECS library used in this project. There are others like [GGEntities](https://www.npmjs.com/package/gg-entities) etc.
- [GUI Showdown ECS](https://abulka.github.io/gui-showdown/main_ecs.html) another example of an app implemented using the ECS architecture (Javascript, open source)
- [GUI Showdown ECS in Python](https://github.com/abulka/gui-showdown) another example of an app implemented using the ECS architecture (Python, open source)

#### TodoMVC related
- [TodoMVC-OO](https://github.com/abulka/todomvc-oo") GitHub Repo - another of my TodoMVC implementations. The classic Javascript TodoMVC app implemented without a framework, using plain Object Oriented programming + a traditional MVC design pattern. Distinct, mediating Controller objects are the key to this implementation.

- Official [TodoMVC project](http://todomvc.com/) with other TodoMVC implementations (e.g. Vue, Angular, React etc.)

#### Diagramming
- [GitUML](https://www.gituml.com) diagramming used for this project
- [Literate Code Mapping](https://github.com/abulka/lcodemaps) diagramming used for this project

<!-- - [Used by](https://github.com/abulka/todomvc-oo) -->
<!-- - [Website](https://www.gituml.com/editz/134) -->
<!-- - [Blog](https://www.gituml.com/editz/136) -->
<!-- - [FAQ](https://www.gituml.com/editz/136) -->

### Articles

- [Medium article]()  (coming in Apr 2020)

<!-- - [MGM](docs_root/mgm.md) pattern (older version of MVCA, presented at a Patterns Conference) -->

<!-- - TodoECS - Entity Component System implementation of TodoMVC *(coming mid 2020)* -->

<!-- ### Support

- [Stack Overflow](http://stackoverflow.com/questions/tagged/MVCA)
- [Twitter](http://twitter.com/unjazz) -->

## Credit

Created by [Andy Bulka](http://andypatterns.com)

Note: This project is not not *officially* part of the [TodoMVC project](http://todomvc.com/) - as it does it meet the criterion of "having a community" around it.
