# Entity Component System • [TodoMVC](http://todomvc.com)

Is the [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system) any good for building traditional GUIs?

It turns out that the answer is yes! Whilst ECS is most commonly used in building games, it can also be used for building a traditional web "form" style application like TodoMVC. However you will need to radically rethink how models, their data and behaviour is organised. 

This is arguably a refreshing, mind-blowing lesson in GUI programming! 🤯😉


![](https://github.com/tastejs/todomvc-app-css/raw/master/screenshot.png)

Live [TodoMVC-ECS demo](https://abulka.github.io/todomvc-ecs/index.html).

---

## ECS - Entity Component System Architectural Pattern

The ECS (Entity Component System) architecture is the new hotness in game developer circles. Its a way of architecting your software that rejects Models as classes in favour of a more deconstructed, data driven approach. The results, in gaming apps at least, are massive reductions in complexity and huge increases in performance and maintainability.

> When I read about ECS it got me thinking - why not use it for more traditional software, not just games?

You can read about Entity Systems in this [Wikipedia article](https://medium.com/r/?url=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FEntity_component_system). The basic idea is to take the Object (that contains identity, data and behaviour) and 'deconstruct it'.

- Entity = like a model, but *has no data and no behaviour* 🤯 Entities are lightweight and dumb - just an id or name
- Component = data
- System = behaviour

### The freedom to attach any Component to any Entity
You now have the freedom to attach any Component to any Entity. But why bother? 

You would think that a pure data Component like `Position {x:0, y:0}` is always closely tied with a specific Entity - so why break them apart? For example a `Ball` has a Position, a `Person` does not! What a `Person` entity surely needs instead is a `Name {firstname:'John', surname:'Smith'}` etc.

Well, it turns out that the opposite is often true - entities like `Ball`, `Bullet`, `Car` all need `Position`. And in more business oriented applications, `Person`, `Employee`, `Manager` all need a `Name`. Thinking further along these lines, an `Address` is a useful data Component that many Entities would need, and having a single declaration of what an address is saves repeat declarations and errors. 

If you think that using class inheritance can achieve the goal of declaring `Address` only once - you would be right. However most languages support only single inheritance, so good luck with forcing disparate inhertiance trees to inherit from a common Address class - that's a bit awkward. With languages that support multiple inheritance (e.g. Python), you will have more luck - in fact multiple inheritance comes closest to matching the idea of ECS, where you can arbitrarily compose a model entity from as many Component data aspects as you like.  

You could also solve the problem through composition - a class could reference a common instance of `Address` and any other common classes it needs. This would also achieve the goal of declaring `Address` only once and providing 'mix and match' composability of Models, that ECS has.

This freedom to decouple data from entities is very powerful, especially when we take the next and final step in understanding ECS - Systems.

### Systems are like DOM/CSS Selectors

Systems are where all the behaviour happens. 
Systems are code blocks which run across subsets of matched Components. 

I guess it comes from the gaming heritage, where there are many game objects to process: looping is central to ECS. If you have a for loop in your code you are probably doing it wrong. Systems magically iterate across entites that match certain Components e.g. all entities who have a Speed component and a Position component. Its like having a CSS selector and running a code block for all matches.

### Choosing an ECS framework

Entity Component System frameworks are relatively simple. They offer ways of defining Entities, adding Components (data objects) to those entity instances, and defining Systems which are code blocks which run across subsets of matched Components. 

For this project I chose to use the javascript [Jecs](https://www.npmjs.com/package/jecs) library.

## Example

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

# Gathering results whilst looping

This is a key technique that I found I needed.

## Ans. buffer intermediate results:

```javascript
  let welcome_user_render = {welcome, firstname, surname}  // create an empty object to buffer

  engine.system('render-display', ['data', 'displayOptions'], (entity, {data, displayOptions}) => {
    if (entity.name == 'model-welcome-message') {
      // buffer intermediate result
      welcome_user_render.welcome = displayOptions.upperright ? data.val.toUpperCase() : data.val
    }
  }
...

  engine.on('tick:after', (engine) => { 
    // flush out pending renders from buffer
    $('#welcome-user').html(`${welcome_user_render.welcome} ${welcome_user_render.firstname} ${welcome_user_render.surname} `)
  })

```

Could leverage the ECS pipeline and rendering to do things in stages
properly. Which then looks like:

```javascript
const topright = engine.entity('display-model-topright');
topright.setComponent('renderData', { welcome:"", firstname:"", surname:"" })

engine.system('render-display', ['data', 'displayOptions'], (entity, { data, displayOptions }) => {
  topright.getComponent('renderData').welcome = 'blah'
});

engine.system('render-display-topright', ['renderData'], (entity, { renderData }) => {
  $topright.html(`${renderData.welcome} ${renderData.firstname} ${renderData.surname} `)
});
```

## Another example of buffering

```javascript
    let todos_data = []  // gather this list for persistence purposes, array of pure data dicts
    engine.system('reset-gather-for-save', ['housekeeping'], (entity, { housekeeping }) => {
        todos_data = []
    });
    engine.system('gather-todos-for-save', ['data'], (entity, { data }) => {
        todos_data.push(data)
    });
    engine.system('save', ['housekeeping'], (entity, { housekeeping }) => {
        util.store('todos-oo', todos_data)
        console.log('saved', JSON.stringify(todos_data))
    });
```

that last housekeeping step can be also be done as a `engine.on('tick:after', (engine) => { ` e.g.

```javascript
  engine.on('tick:after', (engine) => { 
      util.store('todos-oo', todos_data)
      console.log('saved', JSON.stringify(todos_data))
  })
```

# Encapsulating Systems into classes

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


## TodoMVC-ECS - Conclusion

The classic Javascript [TodoMVC app](https://github.com/tastejs/todomvc) implemented using an architecture typically used in gaming. This project fully implements the TodoMVC specification.

Running demo [here](https://abulka.github.io/todomvc-ecs/index.html).

<!-- ![mvc-a-architecture](https://raw.githubusercontent.com/abulka/todomvc-oo/master/docs_root/images/mvca-architecture-gituml.svg?sanitize=true) -->


---

### Resources

- [Jecs](https://www.npmjs.com/package/jecs) ECS library used in this project. There are others like [GGEntities](https://www.npmjs.com/package/gg-entities) etc.
- [GUI Showdown ECS](https://abulka.github.io/gui-showdown/main_ecs.html) another example of an app implemented using the ECS architecture (Javascript, open source)
- [GUI Showdown ECS in Python](https://github.com/abulka/gui-showdown) another example of an app implemented using the ECS architecture (Python, open source)
- Official [TodoMVC project](http://todomvc.com/) with other TodoMVC implementations (e.g. Vue, Angular, React etc.)
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
