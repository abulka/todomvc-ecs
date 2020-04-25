(function (window) {
	'use strict';

	// Your starting point. Enjoy the ride!

	// Instantiating engine, timer and simulator
	const engine = new Jecs.Engine();
	const util = new Util();
	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

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

	// Systems

	let markAllComplete = {active: false, state: undefined}
	function setMarkAllComplete(state) {
		markAllComplete.active = true
		markAllComplete.state = state
	}
	function resetMarkAllComplete() {
		markAllComplete.active = false
	}
	engine.system('mark-all-complete', ['data'], (entity, { data }) => {
		if (markAllComplete.active) {
			console.assert(markAllComplete.state != undefined)
			data.completed = markAllComplete.state
			console.log(`mark-all-complete: ${entity.name}, ${JSON.stringify(data)}`);
		}
	});

	const todoTemplate = Handlebars.compile($('#todo-template').html());
	const $todolist = $('ul.todo-list')
	engine.system('controller-todoitem', ['data'], (entity, { data }) => {

		resetMarkAllComplete()  // reset previous system data - Hmmm - this should be done with a post system event? but nothing like this exists

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

		function _insert_gui(li, id) {
			// inserts or replaces li in 'ul.todo-list', returns the new $(li)
			let $existing_li = $(`li[data-id=${id}]`)
			if ($existing_li.length == 1)
				$existing_li.replaceWith(li)  // replace existing li
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
		
		build()  // TODO this gets called each tick - wasteful?  its replacing each li with a new one even if it hasn't changed!

		console.log(`controller-todoitem: ${entity.name}, ${JSON.stringify(data)}`);
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
			setMarkAllComplete(isChecked)  // a System will be used to loop through
			engine.tick()
		}
	}
	const controller_header = new ControllerHeader()



	// Boot

	engine.tick()

})(window);
