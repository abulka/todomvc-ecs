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
    
    // Declare entities - this is like the model, but without data - we attach that later, as 'components'
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
    
    function id_to_entity(id) {
        return engine.getEntity(`todoitem-${id}`)
    }

    function destroy_todoitem(id) {
        // just mark it and keep gui knowledge out of here!
        let todoitem = id_to_entity(id)
        todoitem.setComponent('deleted', {})  // this component just acts like a flag
    }

    // App vars etc.

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

    // let todos = [] // no need for explicit collection - the ECS will do it for us!
    let app_filter = 'all'
    let mark_all = new MarkAll()
    let destroy_completed = false
    let todoCount = 0
    let activeTodoCount = 0

    let step = engine.entity('housekeeping-step')
    step.setComponent('housekeeping', {})

    // for the use of the 'controller-todoitem' system
    const todoTemplate = Handlebars.compile($('#todo-template').html());
    const $todolist = $('ul.todo-list')

    // Systems

    engine.system('mark-all-complete', ['data'], (entity, { data }) => {
        if (mark_all.active) {
            console.assert(mark_all.state != undefined)
            data.completed = mark_all.state
            console.log(`mark-all-complete: ${JSON.stringify(data)}`);
        }
    });

    engine.system('destroy_completed', ['data'], (entity, { data }) => {
        if (destroy_completed && data.completed) {
            console.log(`destroy_completed: ${JSON.stringify(data)}`);
            destroy_todoitem(data.id)
        }
    });

    engine.system('controller-delete', ['data', 'deleted'], (entity, { data, _ }) => {
        // only todo items with the 'deleted' component will be looped through here
        $(`li[data-id=${data.id}]`).remove()
        engine.removeEntity(`todoitem-${data.id}`)
        console.log(`controller-delete '${data.title}'`)
    });

    engine.system('housekeeping-resets', ['housekeeping'], (entity, { housekeeping }) => {
        console.log(`housekeeping-resets (BEGIN): todoCount=${todoCount} activeTodoCount=${activeTodoCount} markAllComplete=${JSON.stringify(mark_all)}, destroy_completed=${destroy_completed}`)
        mark_all.reset()
        destroy_completed = false
        todoCount = 0
        activeTodoCount = 0
        console.log(`housekeeping-resets (END): todoCount=${todoCount} activeTodoCount=${activeTodoCount} markAllComplete=${JSON.stringify(mark_all)}, destroy_completed=${destroy_completed}`)
    });

    engine.system('counting', ['data'], (entity, { data }) => {
        todoCount++
        if (!data.completed)
            activeTodoCount++
        console.log(`counting: todoCount=${todoCount} activeTodoCount=${activeTodoCount}`);
    });

    engine.system('controller-todoitem', ['data'], (entity, { data }) => {
        function event_to_entity(event) {
            let id = $(event.target).closest("li").data("id")
            return id_to_entity(id)
        }

        function event_to_component(event) {
            let id = $(event.target).closest("li").data("id")
            return event_to_entity(event).getComponent('data')
        }

        function editingMode(event) {
            let $input = $(event.target).closest('li').addClass('editing').find('.edit');
            // puts caret at end of input
            $input.val('');
            let model = event_to_component(event)
            $input.val(model.title)  // sets the correct initial value
            $input.focus();
        }

        function editKeyup(e) {
            if (e.which === ENTER_KEY) {
                e.target.blur();
            }
    
            if (e.which === ESCAPE_KEY) {
                $(e.target).data('abort', true).blur();
            }
        }
    
        function toggle(event) {
            let model = event_to_component(event)
            model.completed = !model.completed
            console.log(model)
            engine.tick()
        }

        function bind_events($gui_li) {
            ($gui_li)
                .on('change', '.toggle', toggle)
                .on('dblclick', 'label', editingMode)
                .on('keyup', '.edit', editKeyup)
                .on('focusout', '.edit', update)
                .on('click', '.destroy', destroy)
        }

        function update(e) {
            var el = e.target;
            var $el = $(el);
            var val = $el.val().trim();
    
            if ($el.data('abort')) {
                $el.data('abort', false);
            } else if (!val) {
                destroy(e);
                return;
            } else {
                let model = event_to_component(event)
                model.title = val
                console.log(model)
            }
    
            $(e.target).closest('li').removeClass('editing')
            engine.tick()
        }
        
        function destroy(event) {
            let data = event_to_component(event)
            destroy_todoitem(data.id)
            engine.tick()
        }

        function _insert_gui(li, id) {
            // inserts or replaces li in 'ul.todo-list', returns the new $(li)
            let $existing_li = $(`li[data-id=${id}]`)
            if ($existing_li.length == 1)
                $existing_li.replaceWith(li)  // replace existing li - deprecated since we do more efficient updates now!
            else if ($todolist.find('li').length == 0)
                $todolist.append($(li))  // create initial li
            else
                $(li).insertAfter($todolist.find('li').last())  // append after last li
            return $(`li[data-id=${id}]`)
        }

        function build() {
            let li = todoTemplate(data);
            let $res = _insert_gui(li, data.id);
            bind_events($res);
        }
        
        if ($(`li[data-id=${data.id}]`).length == 0) {  // only build if it doesn't exist
            build()
            console.log('build', data)
        }
        else {  // efficiently update instead
            // _update_gui(data)
            entity.setComponent('action', 'update')
            // console.log('update', data)
        }

        console.log(`controller-todoitem: ${JSON.stringify(data)}`);
    });

    engine.system('controller-update-todoitem', ['data', 'action'], (entity, components) => {
        console.log(`controller-update-todoitem: ${JSON.stringify(components)}`);
        let data = components.data
        if (components.action == 'update') {
            let $existing_li = $(`li[data-id=${data.id}]`)
            $existing_li.toggleClass("completed", data.completed)
            $existing_li.find('input.toggle').prop('checked', data.completed)
            $existing_li.find('label').text(data.title)
        }
        // else
        // else if (gui.insert) {
        //     function _insert_gui(li, id) {
        //         // inserts or replaces li in 'ul.todo-list', returns the new $(li)
        //         let $existing_li = $(`li[data-id=${id}]`)
        //         if ($existing_li.length == 1)
        //             $existing_li.replaceWith(li)  // replace existing li - deprecated since we do more efficient updates now!
        //         else if ($todolist.find('li').length == 0)
        //             $todolist.append($(li))  // create initial li
        //         else
        //             $(li).insertAfter($todolist.find('li').last())  // append after last li
        //         return $(`li[data-id=${id}]`)
        //     }            
        // }
        components.action = ''
    });

    engine.system('apply-filter', ['data'], (entity, { data }) => {
        let $el = $(`li[data-id=${data.id}]`)
        if (app_filter == 'all')
            $el.show()
        else if (app_filter == 'active' && data.completed)
            $el.hide()
        else if (app_filter == 'completed' && !data.completed)
            $el.hide()
        else
            $el.show()
    });

    // No need for these to be Systems - just regular Controller objects instead, since there is no looping?
    // Maybe we could convert them into Systems?

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
            mark_all.state = $(e.target).prop('checked')
            engine.tick()
        }
    }
    const controller_header = new ControllerHeader()


    class ControllerFooter {  // handles filters, reporting number of items
        constructor() {
            this.$footer = $('footer'),
            this.$footer_interactive_area = $('.footer')
            this.footerTemplate = Handlebars.compile($('#footer-template').html());
              
            // Gui events
            this.$footer.on('click', '.clear-completed', this.destroyCompleted.bind(this))
            this.$footer.on('click', 'ul', this.filter_click.bind(this))
    
            // inject the proper footer, which contains name=
            this.renderFooter()
        }
    
        destroyCompleted(e) {
            // The 'destroy-completed' System will be used to loop rather than explicitly looping here
            destroy_completed = true
            engine.tick()
        }
    
        filter_click(e) {
            var $el = $(e.target).closest('li');
            app_filter = $el.find('a').attr("name")
            this.renderFooter()
            engine.tick()
        }
    
        renderFooter() {
            var template = this.footerTemplate({
                activeTodoCount: activeTodoCount,
                activeTodoWord: util.pluralize(activeTodoCount, 'item'),
                completedTodos: todoCount - activeTodoCount,
                filter: app_filter
            });
            this.$footer_interactive_area.toggle(todoCount > 0).html(template);
        }
    }
    const controller_footer = new ControllerFooter()
    
    engine.on('tick:after', (engine) => {
        controller_footer.renderFooter()
    })
    
    // Boot

    create_todoitem("A")
    create_todoitem("B", true)
    engine.tick()

})(window);
