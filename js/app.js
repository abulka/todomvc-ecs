(function (window) {
    'use strict';

    // Your starting point. Enjoy the ride!

    // Instantiating engine, timer and simulator
    const engine = new Jecs.Engine();

    const util = new Util();
    var ENTER_KEY = 13;
    var ESCAPE_KEY = 27;

    Handlebars.registerHelper('eq', function (a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
    });
    
    // Util 

    function id_to_entity(id) {
        return engine.getEntity(`todoitem-${id}`)
    }

    function event_to_entity(event) {
        let id = $(event.target).closest("li").data("id")
        return id_to_entity(id)
    }

    function event_to_component(event) {
        let id = $(event.target).closest("li").data("id")
        return event_to_entity(event).getComponent('data')
    }

    // When 'active', use the boolean 'state' to do something or set some value
    class MarkAll {
        constructor() {
            this.active = false
            this._state = undefined
        }
        set state(bool) {
            this.active = true
            this._state = bool
        }
        get state() {
            return this._state
        }
        reset() {
            this.active = false
            this._state = undefined
        }        
    }

    // App state
    let app = {
        filter: 'all',
        todoCount: 0,
        activeTodoCount: 0,
    }

    // Flags for controlling Systems
    let system = {
        destroy_completed_todos: false,
        mark_all_as_completed_todos: new MarkAll(),
    }

    // Todo entity - create and destroy

    function create_todoitem(title, completed, id) {
        if (id == undefined)
            id = util.uuid()
        if (completed == undefined)
            completed = false
        let entity_name = `todoitem-${id}`  // entity names must be unique in jecs
        let entity = engine.entity(entity_name)
        entity.setComponent('data', {title,  completed, id})
        return entity
    }
          
    function destroy_todoitem(id) {
        // just mark it and keep gui knowledge out of here!
        let todoitem = id_to_entity(id)
        todoitem.setComponent('destroy', {})
    }

    // Systems

    // Create a single entity we can use whenever we want a system to run once, for housekeeping tasks
    engine.entity('single-step').setComponent('housekeeping', {})

    engine.system('mark-all-todos-as-complete', ['data'], (entity, { data }) => {
        if (system.mark_all_as_completed_todos.active) {
            data.completed = system.mark_all_as_completed_todos.state
            console.log(`mark-all-todos-as-complete: ${JSON.stringify(data)}`);
        }
    });

    engine.system('destroy-completed-todos', ['data'], (entity, { data }) => {
        if (system.destroy_completed_todos && data.completed) {
            console.log(`destroy-completed-todos: ${JSON.stringify(data)}`);
            destroy_todoitem(data.id)
        }
    });

    engine.system('controller-destroy', ['data', 'destroy'], (entity, {data, _}) => {
        $(`li[data-id=${data.id}]`).remove()
        engine.removeEntity(`todoitem-${data.id}`)
        console.log(`controller-destroy '${data.title}'`)
        entity.deleteComponent('destroy')  // redundant since its removed
    });

    engine.system('housekeeping-resets', ['housekeeping'], (entity, { housekeeping }) => {
        function report() { 
            return `app flags=${JSON.stringify(app)}, ` +
                   `system flags=${JSON.stringify(system)}`
        }
        console.log(`housekeeping-resets (before): ${report()}`)
        system.mark_all_as_completed_todos.reset()
        system.destroy_completed_todos = false
        app.todoCount = 0
        app.activeTodoCount = 0
        console.log(`housekeeping-resets (after): ${report()}`)
    });

    engine.system('counting', ['data'], (entity, { data }) => {
        app.todoCount++
        if (!data.completed)
            app.activeTodoCount++
        console.log(`counting: todoCount=${app.todoCount} activeTodoCount=${app.activeTodoCount}`);
    });

    engine.system('editing-mode-on', ['data', 'editingmode'], (entity, {data, _}) => {
        let $li = $(`li[data-id=${data.id}]`)
        let $input = $li.addClass('editing').find('.edit')
        // puts caret at end of input
        $input.val('');
        $input.val(data.title)  // sets the correct initial value
        $input.focus();
        console.log(`editing-mode-on: ${JSON.stringify(data)}`);
        entity.deleteComponent('editingmode')
    });

    engine.system('editing-mode-off', ['data', 'editingmode-off'], (entity, {data, _}) => {
        let $li = $(`li[data-id=${data.id}]`)
        let $input = $li.addClass('editing').find('.edit')
        let val = $input.val().trim()
        if ($input.data('abort')) {
            $input.data('abort', false);
        } else if (!val) {
            destroy(e);
            return;
        } else {
            data.title = val
            console.log(`editing-mode-off: ${JSON.stringify(data)}`)
        }
        $li.removeClass('editing')
        entity.deleteComponent('editingmode-off')
    });


    class ControllerTodo {
        constructor() {
            this.todoTemplate = Handlebars.compile($('#todo-template').html());
            this.$todolist = $('ul.todo-list')

            engine.system('think-todoitem', ['data'], (entity, { data }) => {
                if ($(`li[data-id=${data.id}]`).length == 0) {  // gui li doesn't exist
                    entity.setComponent('insert', {})
                    console.log(`think-todoitem: ${JSON.stringify(data)}, insert`);
                }
                else {
                    entity.setComponent('update', {})
                    console.log(`think-todoitem: ${JSON.stringify(data)}, update`);
                }
            });

            engine.system('controller-update-todoitem', ['data', 'update'], (entity, {data, _}) => {
                let $existing_li = $(`li[data-id=${data.id}]`)
        
                // let li = this.todoTemplate(data);
                // $existing_li.replaceWith(li)  // replace existing li - deprecated since we do more efficient updates now!
        
                $existing_li.toggleClass("completed", data.completed)
                $existing_li.find('input.toggle').prop('checked', data.completed)
                $existing_li.find('label').text(data.title)
        
                console.log(`controller-update-todoitem: ${JSON.stringify(data)}`);
                entity.deleteComponent('update')
            });
        
            engine.system('controller-insert-todoitem', ['data', 'insert'], (entity, {data, _}) => {
                let li = this.todoTemplate(data);
                if (this.$todolist.find('li').length == 0)
                    this.$todolist.append($(li))  // create initial li when todo gui list is empty
                else
                    $(li).insertAfter(this.$todolist.find('li').last())  // append after last li
                
                this.bind_events($(`li[data-id=${data.id}]`));

                console.log(`controller-insert-todoitem: ${JSON.stringify(data)}`);
                entity.deleteComponent('insert')
            });
        }

        bind_events($gui_li) {
            ($gui_li)
                .on('change', '.toggle', function(event) {
                    event_to_component(event).completed = !event_to_component(event).completed
                    engine.tick()
                })
                .on('dblclick', 'label', function(event) {
                    event_to_entity(event).setComponent('editingmode', {})
                    engine.tick()
                })
                .on('keyup', '.edit', function(event) {
                    if (event.which === ENTER_KEY) event.target.blur()
                    if (event.which === ESCAPE_KEY) $(event.target).data('abort', true).blur()
                })
                .on('focusout', '.edit', function(event) {
                    event_to_entity(event).setComponent('editingmode-off', {})
                    engine.tick()
                })
                .on('click', '.destroy', function(event) {
                    destroy_todoitem(event_to_component(event).id)
                    engine.tick()
                })
        }
    }
    new ControllerTodo()


    engine.system('apply-filter', ['data'], (entity, { data }) => {
        let $el = $(`li[data-id=${data.id}]`)
        if (app.filter == 'all')
            $el.show()
        else if (app.filter == 'active' && data.completed)
            $el.hide()
        else if (app.filter == 'completed' && !data.completed)
            $el.hide()
        else
            $el.show()
    });


    class ControllerHeader {  // handles adding new items and toggling all as completed/not completed
        constructor() {
            this.$input = $('.new-todo')
            this.$toggle_all = $('.toggle-all')

            // Gui events -> this controller
            this.$input.on('keyup', (event) => { this.on_keyup(event) })
            this.$toggle_all.on('change', this.toggleAll.bind(this))
        }
    
        on_keyup(e) {
            var $input = $(e.target);
            console.assert($input.get(0) == this.$input.get(0))
            var val = $input.val().trim();
    
            if (e.which !== ENTER_KEY || !val)
                return;
    
            $input.val('');
    
            create_todoitem(val)
            engine.tick()
        }
    
        toggleAll(e) {
            // The 'mark-all-complete' System will be used to loop through all entities and marking them as completed or
            // not, rather than explictly looping here - interesting.
            system.mark_all_as_completed_todos.state = $(e.target).prop('checked')
            engine.tick()
        }
    }
    new ControllerHeader()


    class ControllerFooter {  // handles filters, reporting number of items
        constructor() {
            this.$footer = $('footer'),
            this.$footer_interactive_area = $('.footer')
            this.footerTemplate = Handlebars.compile($('#footer-template').html());
              
            // Gui events
            this.$footer.on('click', '.clear-completed', this.destroyCompleted)
            this.$footer.on('click', 'ul', this.filter_click.bind(this))
    
            // initialisation, inject the proper footer, which contains name=
            this.renderFooter()

            // this will happen every time
            engine.system('render-footer', ['housekeeping'], (entity, { housekeeping }) => {
                this.renderFooter()
            })            
        }
    
        destroyCompleted(e) {
            // The 'destroy-completed' System will be used to loop rather than explicitly looping here
            system.destroy_completed_todos = true
            engine.tick()
        }
    
        filter_click(e) {
            var $el = $(e.target).closest('li');
            app.filter = $el.find('a').attr("name")
            this.renderFooter()
            engine.tick()
        }
    
        renderFooter() {
            var template = this.footerTemplate({
                activeTodoCount: app.activeTodoCount,
                activeTodoWord: util.pluralize(app.activeTodoCount, 'item'),
                completedTodos: app.todoCount - app.activeTodoCount,
                filter: app.filter
            });
            this.$footer_interactive_area.toggle(app.todoCount > 0).html(template);
        }
    }
    new ControllerFooter()
    

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
        }

        save() {
            util.store('todos-oo', this.todos_data)
            console.log('saved', JSON.stringify(this.todos_data))
        }

        load() {
            let todos_array = util.store('todos-oo')
            todos_array.forEach(function (todo) {
                create_todoitem(todo.title, todo.completed, todo.id)
            }, this)
        }        
    }
    let persistence = new Persistence()


    class ControllerDebug {
        constructor() {
            this.display = false
            this.verbose = false
            this.todos = []  // gather this list for temporary debug purposes, can be entities or just data components

            this.$cb_display = $('input[name="debug"]')
            this.$cb_verbose = $('input[name="debug_verbose"]')
            this.$area = $('#debug_area')
            this.$area_verbose = $('#debug_verbose')
            this.pre_output = document.querySelector('pre.debug')

            // Gui events
            this.$cb_display.on('change', (event) => { this.on_display(event) })
            this.$cb_verbose.on('change', (event) => { this.on_verbose(event) })

            // Systems
            engine.system('reset-todos', ['housekeeping'], (entity, { housekeeping }) => {
                this.todos = []
            })
            engine.system('gather-todos', ['data'], (entity, { data }) => {
                this.todos.push(this.verbose ? entity : data)
            })            
            engine.system('dump', ['housekeeping'], (entity, { housekeeping }) => {
                this.dump()
            })
        }

        log(...txt) {
            this.pre_output.textContent = `${txt.join("\n")}\n`
        }
    
        on_display(event) {
            this.$area.toggleClass("invisible")
            this.$area_verbose.toggleClass("invisible")
            this.display = this.$cb_display.prop('checked')
            engine.tick()
        }

        on_verbose(event) {
            this.verbose = this.$cb_verbose.prop('checked')
            engine.tick()
        }

        dump() {
            if (this.display) {
                this.log(JSON.stringify({app, system, todos:this.todos} , null, 2))
            }            
        }
    }
    new ControllerDebug()

    // After each run of all Systems, extra commands can be added
    engine.on('tick:after', (engine) => {
        console.log('-'.repeat(40))
    })
    
    // Boot

    persistence.load()
    // create_todoitem("A")
    // create_todoitem("B", true)
    engine.tick()

})(window);
