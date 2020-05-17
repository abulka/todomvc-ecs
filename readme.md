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

Well, it turns out that the opposite is often true - entities like `Ball`, `Bullet`, `Car` *all* need `Position`. And in more business oriented applications, `Person`, `Employee`, `Manager` *all* need a `Name`. 

Thinking further along these lines, another useful component might be `Address` - many Entities would need that. Thus having a *single* declaration of `Name` and `Address` etc. which can be re-used many times saves having duplicate declarations and associated errors.

## What about using Inheritance?

If you think that using class *inheritance* can achieve the goal of declaring `Address` only once - you would be right. However most languages support only single inheritance, so good luck with forcing disparate inheritance trees to inherit from a common Address class - that's a bit awkward. 

With languages that support multiple inheritance (e.g. Python), you will have more luck - in fact multiple inheritance comes closest to matching the idea of ECS, where you can arbitrarily compose a model entity from as many Component data aspects as you like.  

## What about using Composition?

You could also solve the problem through *composition* - a class could reference a common instance of `Address` and any other common classes it needs. This would also achieve the goal of declaring `Address` only once and providing 'mix and match' composability of Models, that ECS has.

## The ECS solution to composability

This is how we arbitrarily attach data Components to entities in ECS:

```javascript
let e = engine.entity('person 1')
e.setComponent('Name', {firstname:'John', surname:'Smith'})
e.setComponent('Address', {number: 12, street: 'Bounty Drive', state: 'WA'})
```

We have created an entity `person 1` and attached both a `Name` and an `Address` Component. Running 

```javascript
console.log(
    e.name, 
    JSON.stringify(e.getComponent('Name')), 
    JSON.stringify(e.getComponent('Address'))
)
```

results in:

```javascript
person 1 {"firstname":"John","surname":"Smith"} {"number":12,"street":"Bounty Drive","state":"WA"}
```

You can attach even Components that have no actual data. Sometimes this technique is useful to mark entities e.g. a `dirty` Component flag for rendering purposes, or a `delete` Component flag etc. so that a System selector matches on this condition (of having this flag) and triggers that particular System to run. This technique is further discussed in the section entitled [Components as Flags](#components-as-flags), later.

```javascript
e.setComponent('Flag', {})
e.setComponent('Flag2', null)
```

This freedom to decouple data from entities is very powerful, especially when we take the next and final step in understanding ECS - Systems.

# Systems

Systems are where most of the application behaviour happens, including rendering/updating the DOM.

The idea is to have lots of Systems, one after each other, each doing a bit of work that can be reasoned about simply.

![TodoMVC-ECS Architecture Partial Diagram](https://abulka.github.io/todomvc-ecs/images/ecs-partial.png)
*TodoMVC-ECS Architecture - Partial Diagram*

- The above diagram was generated semi-automatically from Javascript source code residing in GitHub using [GitUML](www.gituml.com).
- Click [here](https://abulka.github.io/todomvc-ecs/images/ecs-full.svg?sanitize=true) for more diagram detail as a .svg and the ability to zoom. 
- View this actual [diagram 170](https://www.gituml.com/viewz/170) on GitUML.

## Selecting

Systems are code blocks which run across subsets of entities which have *all* the components listed in each System's declaration e.g. `['data', 'dirty']` means all entities that possess both these components will be processed.

Here is an example of a two Systems, which run one after the other:

```javascript
// process all entities with data component
engine.system('process-all', ['data'], (entity, { data }) => {
    console.log(`Found entity ${entity} with data ${data}`)
});

// all entities with data component and dirty component
engine.system('find-dirty', ['data', 'dirty'], (entity, { data, dirty }) => {
    console.log(`Found dirty entity ${entity}`)
});
```

I like to think of **the list of Components declared on each System** as like a CSS selector, except it applies to ECS entities. The system will loop through all entities who possess all the Components listed (an `and` concept).

## Pipeline approach

System blocks run in the order declared, one after the other, each time `engine.tick()` is called.  Each System will iterate as needed, then exit and the next System will run.

Systems form a multi-stage processing pipeline. A System often builds on the work of the previous System - this is a strength of this ECS architecture, the ability to break down work into easy to understand stages. 

See [Systems in this Todo app](#systems-in-this-todo-app), below, to see a table Systems I came up with to implement TodoMVC and what they do. Its suprising to discover that one can build an app in this way.

## Looping

As you have probably noticed, looping is central to ECS. I guess it comes from the gaming heritage, where there are many game objects to process. 

> If you have an explicit for loop in your code you are probably doing ECS wrong!  Use a System instead.

Systems magically iterate across entites that match certain Components e.g. all entities who have a Speed component and a Position component. Its like having a CSS selector and running a code block for all matches.

If you don't want to loop through anything, and just have to do some miscellaneous work at any stage, simply insert a System that matches on a single component.

```javascript
engine.entity('single-step').setComponent('housekeeping', {})
...
engine.system('reset-todos', ['housekeeping'], (entity, { housekeeping }) => {
    // this code will run once per tick
})
```

Read more about this technique below, in the section [The housekeeping Component trick](#The-housekeeping-Component-trick)

## The tick

When there is any change to the application, you need to trigger `engine.tick()` again, in order to re-render the GUI. The tick function simply re-runs all Systems again.

Remember to boot your app with a lone call to `engine.tick()` at the bottom of the app javascript file.

Game based ECS systems typically run `tick` in a loop at 60fps which is not appropriate for our form based GUI, but by all means, enable the automatic looping feature of your ECS if you feel that strategically calling tick is too much to think about!

You may also have a use for the handy `'tick:after'` and `'tick:after'` events to run code before and after each tick runs all the Systems.

```javascript
engine.on('tick:after', (engine) => {
    console.log('-'.repeat(40))
})
```

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

Notice there is no explicit looping. The System loops for us. All entities who have the 'data' component will be looped through. You can add additional components to the list, which will mean the system will loop through all components who have *all* those components (an `and` selector).  

You can have multiple systems, they will run in the order declared.  Each time `engine.tick()` is run, all Systems will be run.

Notice there is no need to store a master list of `todos` - the ECS holds all entities for us.  If we did want to generate a list of todos, its actually a bit tricky. See the next section [Gathering results whilst looping](#gathering-results-whilst-looping).

# ECS enhancements

I ended up creating a couple of tricks to get ECS to do what I wanted in certain cases.

## Gathering results whilst looping

Generating a list of todos is pretty easy - just declare a System which matches a Component that all todo entities have, and push each entity onto a list. 

```javascript
let todos = []

engine.system('gather-todos-for-save', ['data'], (entity, { data }) => {
    todos_data.push(data)
});
```

You can gather anything you want in this way, e.g. 
- push the whole data Component with `push(data)`
- push only the todo title with `push(data.title)`
- push the entity itself with `push(entity)`
- etc.

The only problem is that next time you tick(), `todos` is not cleared and your list will double, triple, quadriple etc.  The easiest way to solve this is to utilise the `'tick:before'` event and clear `todos` before each tick run:

```javascript
engine.on('tick:before', (engine) => {
    todos = []  // reset
})
```

I use the above technique to generate the JSON of all the todo data to persist in the browser storage. Try the [live demo](https://abulka.github.io/todomvc-ecs/index.html) and hit refresh - the same todo items survive, because of this persistence.

### Advanced reset of a variable

If you want to reset some variables or do some processing in the middle of the pipeline e.g.

```
System1
System2
        <-- reset a variable here
System3
```

then you will need to create a System whose codeblock runs once, and define it at the appropriate point in your code - after System2 and before System3.

To create a System whose codeblock runs once, use [The housekeeping Component trick](#The-housekeeping-Component-trick), below, which defines a special Component and Entity pair, then create a System matching on them.

### The housekeeping Component trick

If you need to initialise variables in the middle of a system run (remember the order that systems run in is critical, with one system often feeding results into another system) then reseting at the start or beginning of a tick won't work.  We need to be able to define a System which does the reset or housekeeping tasks, which we can place anywhere in our list of Systems. And we don't want that System to loop, we want it to run once. Which means it must match only one entity.

The solution is to define a special Component and Entity pair

```javascript
engine.entity('single-step').setComponent('housekeeping', {})
```

then whever you need to run some code, insert a System like this:

```javascript
engine.system('reset-todos', ['housekeeping'], (entity, { _ }) => {
    this.todos = []
})
```

The entity name `'single-step'` is arbitrary and can be anything. The Component name `'housekeeping'` is also arbitrary, but is referred to in Systems, as you can see in the above example.

You can use this technique to insert as many sytems like this as you like, at the appropriate places in your code. I'm not sure if it is kosher ECS usage, but its a technique I found I needed.

### Full code for gathering a list of todos

Thus the full code for gathering a list of todos, using the above housekeeping system technique, is

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

I use this trick extensively in this Todo implementation.

## Encapsulating Systems into classes

Just because we are deconstructing classes into an ECS approach doesn't mean we can't use classes to help us. 
Systems still work when created inside classes - they are registered with the engine and will run ok.

You might want to use a class to group variables that are private to specific Systems together, so they do not pollute the outer namespaces e.g. `this.todos_data` in the example below. Classes are also handy places to define functions that are private to specific Systems, too e.g. the `save()` method in the example below.

```javascript
class Persistence {
    constructor() {
        this.todos_data = []  // gather info here

        engine.system('reset-save', ['housekeeping'], (entity, { _ }) => {
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

This use of Systems inside Classes is arguably nicer and more encapsulated.

The only thing to watch out for is that you need to instantiate the classes in the correct order, so that their Systems are created (via their constructors) at the appropriate point in the 'pipeline' of Systems.

# Other thoughts on ECS

## No Events needed

Whilst there are GUI events from the DOM, notice that there are no 'internal' events in this implementation. This is a very real benefit, as event flow can be hard to follow.

The efficiency of the ECS approach is not as good as an event based approach however, because we are re-rendering more than we need to. Internal events give us a finer grained control over what needs to be updated in the GUI. See my [TodoMVC-OO](https://github.com/abulka/todomvc-oo") implementation to see how efficiently event notifications from the model to controllers can work.

## Optimising GUI updates

Adding a dirty flag to entities that need updating can fix this brute force re-rendering inefficiency. I'd recommend a Component called `'dirty'` which can be attached to entities. Then refine your Systems to only match on todo data that is dirty e.g.

```javascript
engine.system('dirty-todoitems', ['data', 'dirty'], (entity, {data, _}) => {
    // do something with entity and data
    // ...
    entity.deleteComponent('dirty')  // important! remove dirty flag
}
```

Notice that the last line of this System *removes* the dirty flag/component.  When you change the data of the entity, you would add the `'dirty'` component e.g. 

```javascript
entity.getComponent('data').completed = false
entity.setComponent('dirty', {})
```

# Systems in this Todo app

Systems are where most of the behaviour lives. The idea is that each System is a loop which 'queries' our little database of entities and components and does something with the matching entities and components. I came up with the following Systems, which run in the following order, top to bottom, pipeline:

| System name | Documentation |
| ----------- | ------------- |
| mark-all-todos-as-complete | Loops through all todo entities and sets `data.complete = true` 
| destroy-completed-todos | Loops through all todo entities and attaches the 'destroy' component if it is complete (see next system which does the actual deletion)
| controller-destroy | Loops through all todo entities that have the 'destroy' component and deletes the GUI and the entity
| housekeeping-resets | Runs once (matches the single 'housekeeping' component), reset various variables incl `todoCount`. See [The housekeeping Component trick](#The-housekeeping-Component-trick) above.
| counting | Loops through all todo entities and counts the total number `todoCount` and number completed.
| editing-mode-on | Any entity with the 'editingmode' component will have the GUI element for it go into editing mode. The 'editingmode' component is removed from the entity.
| editing-mode-off | Any entity with the 'editingmode-off' component will have the GUI element for it go out of editing mode and the new todo item title saved in the entitie's `data.title` component. The 'editingmode-off' component is removed from the entity.
| think-todoitem | Decides whether a todo entity needs the GUI DOM `<li>` created or updated, adding either the component `'insert'` or `'update'` to each entity. *Note that the 'insert' and 'update' components have empty data `{}` attached thus the component acts like a flag*.
| controller-update-todoitem | For any entity that has the `'update'` component, updates the GUI with the entity's data. The `'update'` component is then removed from the entity.
| controller-insert-todoitem | For any entity that has the `'insert'` component, created the GUI with the entity's data, and binds the GUI event handlers to javascript functions in our app. The `'insert'` component is then removed from the entity.
| apply-filter | Loops through all todo entities and hides or shows the corresponding GUI element depending on the state of the `app.filter` flag.
| reset-gather-for-save | Runs once (matches the single 'housekeeping' component), reset the `todos_data` list variable ready for the next System.  See [The housekeeping Component trick](#The-housekeeping-Component-trick), above.
| gather-todos-for-save | For each entity, append its data to the `todos_data` list variable.
| save | Saves the `todos_data` list variable data into browser storage.

That's a lot of Systems!  But each System runs after the other, and each one is easy to reason about.  That's the benefit of ECS - its more 'flat' I suppose.

Remember, the systems will only run when you call `engine.tick()`, so don't forget to do that.  When you want all the Systems to run again, simply call `engine.tick()` again.


# Choosing an ECS framework

Entity Component System frameworks are actually relatively simple. They offer ways of:
1. defining `Entities`, 
1. adding `Components` (data objects) to those entity instances, 
1. defining `Systems` - which are code blocks which run across subsets of matched Components.
1. a `tick` function

For this project I chose to use the javascript [Jecs](https://www.npmjs.com/package/jecs) library.

![Jecs ESC Framework for Javascript - UML](https://abulka.github.io/todomvc-ecs/images/jecs.svg?sanitize=true)
*Jecs ESC Framework for Javascript - UML.*

- The above diagram was generated semi-automatically from Javascript source code residing in GitHub using [GitUML](www.gituml.com).
- Click [here](https://abulka.github.io/todomvc-ecs/images/jecs.svg?sanitize=true) for more diagram detail as a .svg and the ability to zoom. 
- View this actual [diagram 168](https://www.gituml.com/viewz/168) on GitUML.

The single file `jecs.js` can be copied into your project and with the usual `<script src="jecs.js"></script>` you are all set to go. Or you can `npm install jecs` and require it in your node projects.

For my Python ECS projects I use [Esper](https://github.com/benmoran56/esper) which is a lightweight Entity System for Python, with a focus on performance.

# Conclusion

This approach to wiring up GUI's has been most refreshing. I find the ECS approach fascinating and will be looking for ways to use decoupled Systems in my future projects.


# Resources

#### Demo

- Running demo [here](https://abulka.github.io/todomvc-ecs/index.html), fully implements the TodoMVC specification.


- Study the final code in this repository, specifically [app.js](https://github.com/abulka/todomvc-ecs/blob/master/js/app.js).

#### ECS
- [Jecs](https://www.npmjs.com/package/jecs) ECS library used in this project. There are others like [GGEntities](https://www.npmjs.com/package/gg-entities) etc.
- [GUI Showdown ECS](https://abulka.github.io/gui-showdown/main_ecs.html) another example of an app implemented using the ECS architecture (Javascript, open source). Aso see [GUI Showdown ECS in Python](https://github.com/abulka/gui-showdown). 

#### TodoMVC related
- [TodoMVC-OO](https://github.com/abulka/todomvc-oo) GitHub Repo - another of my TodoMVC implementations. The classic Javascript TodoMVC app implemented without a framework, using plain Object Oriented programming.

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
