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

    // let todos = [] // do we actually want a collection - the ECS will do it for us!
    create_todoitem("A")
    create_todoitem("B", true)

    // App vars etc.

    class MarkAllComplete {
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
    let markAllComplete = new MarkAllComplete()
    let todoCount = 0
    let activeTodoCount = 0
    let app_filter = 'all'

    // not really usefule making this an entity, as there is no processing
    // we can do of anything in a system
    // let mark_complete = engine.entity('mark-complete')
    // mark_complete.setComponent('markall-data', {active: false, state: undefined})

    let step = engine.entity('housekeeping-step')
    step.setComponent('housekeeping', {})

    // Systems

    engine.system('mark-all-complete', ['data'], (entity, { data }) => {
        if (markAllComplete.active) {
            console.assert(markAllComplete.state != undefined)
            data.completed = markAllComplete.state
            console.log(`mark-all-complete: ${entity.name}, ${JSON.stringify(data)}`);
        }
    });

    engine.system('housekeeping-reset-counts', ['housekeeping'], (entity, { housekeeping }) => {
        console.log(`housekeeping-reset-counts (BEGIN): todoCount=${todoCount} activeTodoCount=${activeTodoCount} markAllComplete=${JSON.stringify(markAllComplete)}`);
        markAllComplete.reset()
        todoCount = 0
        activeTodoCount = 0
        console.log(`housekeeping-reset-counts (END): todoCount=${todoCount} activeTodoCount=${activeTodoCount} markAllComplete=${JSON.stringify(markAllComplete)}`);
    });

    engine.system('counting', ['data'], (entity, { data }) => {
        todoCount++
        if (!data.completed)
            activeTodoCount++
        // console.log(`counting: ${entity.name}, ${JSON.stringify(data)} todoCount=${todoCount} activeTodoCount=${activeTodoCount}`);
        console.log(`counting: todoCount=${todoCount} activeTodoCount=${activeTodoCount}`);
    });

    const todoTemplate = Handlebars.compile($('#todo-template').html());
    const $todolist = $('ul.todo-list')
    engine.system('controller-todoitem', ['data'], (entity, { data }) => {

        function event_to_entity(event) {
            let id = $(event.target).closest("li").data("id")
            return engine.getEntity(`todoitem-${id}`)
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
            // li element needs to be re-bound every time it is rebuilt/rendered, which happens after each "modified todoitem" event notification
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
            console.log(`controller for '${data.title}' got DELETE user event from GUI ***`)
            _delete_gui(data.id)
            engine.removeEntity(`todoitem-${data.id}`)
            engine.tick()
        }

        function _update_gui(data) {
            // a bit laborious - easier to replace entire li, but let's give it a go
            /*
			<li {{#if completed}}class="completed"{{/if}} data-id="{{id}}">
				<div class="view">
					<input class="toggle" type="checkbox" {{#if completed}}checked{{/if}}>
					<label>{{title}}</label>
					<button class="destroy"></button>
				</div>
				<input class="edit" value="{{title}}">            
            */
            let $existing_li = $(`li[data-id=${data.id}]`)
            $existing_li.toggleClass("completed", data.completed)
            $existing_li.find('input.toggle').prop('checked', data.completed)
            $existing_li.find('label').text(data.title)
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

        function _delete_gui(id) {
            // delete the GUI element
            $(`li[data-id=${id}]`).remove()
        }

        function build() {
            let li = todoTemplate(data);
            let $res = _insert_gui(li, data.id);
            bind_events($res);
            // this.apply_filter(this.app.filter);
        }
        
        if ($(`li[data-id=${data.id}]`).length == 0) {  // only build if it doesn't exist
            build()
            console.log('build', data)
        }
        else {  // need to update instead
            _update_gui(data)
            console.log('update', data)
        }

        console.log(`controller-todoitem: ${entity.name}, ${JSON.stringify(data)}`);
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


    // engine.system('controller-header', ['data'], (entity, { data }) => {
    // 	console.log(`controller-header: ${entity.name}, ${JSON.stringify(data)}`);
    // });
    class ControllerHeader {  // handles adding new items and toggling all as completed/not completed
        // constructor(app, gui_dict) {
        constructor() {
            // this.app = app
            // this.gui = gui_dict  // some not used cos can derive gui from $(e.target)
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
            // this.app.add(val, util.uuid(), false, {during_load: false})  // title, id, completed
            engine.tick()
        }
    
        toggleAll(e) {
            var isChecked = $(e.target).prop('checked');
    
            // AHA - this is where a System could work!!!  done.
            // this.app.todos.forEach(function (todo) {
            // 	todo.completed = isChecked;
            // });
            markAllComplete.state = isChecked  // a System will be used to loop through
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
    
            // Internal events
            // document.addEventListener("app model changed", (event) => { this.notify(event) })
            // document.addEventListener("modified todoitem", (event) => { this.notify(event) })
        }
    
        destroyCompleted(e) {
            //this.app.destroyCompleted()  // TODO
            console.log('not implemented yet')
        }
    
        filter_click(e) {
            var $el = $(e.target).closest('li');
            app_filter = $el.find('a').attr("name")
            this.renderFooter()
            engine.tick()
    
            // this broadcast goes to all the todoitem controllers
            // NEED TO USE A SYSTEM HERE - SET THE FILTER GLOBALLY AND THE SYSTEM RESPECTS THE FILTER?
            // OR JUST BLEND IT INTO THE CURRENT MAIN RENDERING SYSTEM
            // notify_all("filter changed", this, {'filter': this.filter});		
        }
    
        renderFooter() {
            // this is a System - CALCULATE ALL THIS INFO BY LOOPING
            // var todoCount = this.app.todos.length;
            // var activeTodoCount = this.app.getActiveTodos().length;
            var template = this.footerTemplate({
                activeTodoCount: activeTodoCount,
                activeTodoWord: util.pluralize(activeTodoCount, 'item'),
                completedTodos: todoCount - activeTodoCount,
                filter: app_filter
            });
    
            this.$footer_interactive_area.toggle(todoCount > 0).html(template);
        }
    
        // notify(event) {
        // 	console.log(`\tcontroller for footer got told to render footer cos '${event.type}'`)
        // 	this.renderFooter()
        // }
    
    }
    const controller_footer = new ControllerFooter()
    
    engine.on('tick:after', (engine) => {
        controller_footer.renderFooter()
    })
    
    // Boot

    engine.tick()

})(window);
