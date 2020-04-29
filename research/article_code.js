const { Engine, Simulator } = require('jecs')
const { Util } = require('../js/util')

util = new Util()

class TodoItem {
    constructor(title, completed, id) {
        this.title = title
        this.completed = completed
        this.id = id == undefined ? util.uuid() : id
    }
    report() {
        let is_or_is_not = this.completed ? 'is' : 'is not'
        console.log(`Todo item ${this.title} has id ${this.id} and ${is_or_is_not} completed`)
    }
}

let todos = []
todos.push(new TodoItem('make lunch', true, 1))
todos.push(new TodoItem('wash dishes', false, 2))

todos.forEach(function (todo) {
    todo.report()
})

// ECS

// const engine = new Jecs.Engine();
const engine = new Engine();

// console.log('-- ECS '.repeat(5))
// function create_todoitem(title, completed, id) {
//     if (id == undefined)
//         id = util.uuid()
//     let entity_name = `todoitem-${id}`
//     let entity = engine.entity(entity_name)
//     entity.setComponent('data', {title,  completed, id})
//     return entity
// }

// create_todoitem('make lunch', true)
// create_todoitem('wash dishes', false)

// engine.system('report', ['data'], (entity, { data }) => {
//     let is_or_is_not = data.completed ? 'is' : 'is not'
//     console.log(`Todo item ${data.title} has id ${data.id} and ${is_or_is_not} completed`)
// });

// engine.tick()

console.log('-- ECS '.repeat(5))

engine.entity(util.uuid()).setComponent('data', {title:'make lunch',  completed:true})
engine.entity(util.uuid()).setComponent('data', {title:'wash dishes',  completed:false})
engine.system('report', ['data'], (entity, { data }) => {
    let is_or_is_not = data.completed ? 'is' : 'is not'
    console.log(`Todo item ${data.title} has id ${entity.name} and ${is_or_is_not} completed`)
});
engine.tick()

// -------

let e = engine.entity('person 1')
e.setComponent('Name', {firstname:'John', surname:'Smith'})
e.setComponent('Address', {number: 12, street: 'Bounty Drive', state: 'WA'})
console.log(e.name, JSON.stringify(e.getComponent('Name')), JSON.stringify(e.getComponent('Address')))
e.setComponent('Flag', {})
console.log(e.name, JSON.stringify(e.getComponent('Flag')))
e.setComponent('Flag2', null)
console.log(e.name, JSON.stringify(e.getComponent('Flag2')))
