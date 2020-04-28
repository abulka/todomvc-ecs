
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
