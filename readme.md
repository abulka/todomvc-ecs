# Entity Component System • [TodoMVC](http://todomvc.com)

Is the [Entity Component System](https://en.wikipedia.org/wiki/Entity_component_system) any good for building traditional GUIs?

It turns out that the answer is yes! Whilst ECS is most commonly used in building games, it can also be used for building a traditional web "form" style application like TodoMVC. However you will need to radically rethink how models, their data and behaviour is organised. 

This is arguably a refreshing, mind-blowing lesson in GUI programming!


![](https://github.com/tastejs/todomvc-app-css/raw/master/screenshot.png)

Running demo [here](https://abulka.github.io/todomvc-ecs/index.html).

---

## ECS - Entity Component System Architectural Pattern

This project fully implements the TodoMVC specification. It is implemented using an Entity Component System framework, in this case [Jecs](https://www.npmjs.com/package/jecs).


- Entity = like a model
- Component = model data and associated attributes attached arbitrarily
- System = behaviour incl. controller rendering to GUI

Declare entities - this is like the model, but without data - we attach that later, as 'components'

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

Systems still work when created inside classes - they are registered with the engine and will run ok.

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
