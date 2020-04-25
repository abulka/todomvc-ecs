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

	const todoTemplate = Handlebars.compile($('#todo-template').html());
	const $todolist = $('ul.todo-list')
	engine.system('controller-todoitem', ['data'], (entity, { data }) => {

		function event_to_model(event) {
			let id = $(event.target).closest("li").data("id")
			let model = engine.getEntity(`todoitem-${id}`).getComponent('data')
			return model
		}

		function editingMode(event) {
			let $input = $(event.target).closest('li').addClass('editing').find('.edit');
			// puts caret at end of input
			$input.val('');
			let id = $(event.target).closest("li").data("id")
			let model = engine.getEntity(`todoitem-${id}`).getComponent('data')
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
			let id = $(event.target).closest("li").data("id")
			let entity = engine.getEntity(`todoitem-${id}`)
			let component = entity.getComponent('data')
			component.completed = !component.completed
			console.log(component)
			// but no refresh yet till next tick.... ? But its not needed cos the gui is already up to date?
		}

		function bind_events($gui_li) {
			// li element needs to be re-bound every time it is rebuilt/rendered, which happens after each "modified todoitem" event notification
			($gui_li)
				.on('change', '.toggle', toggle)
				.on('dblclick', 'label', editingMode)
				.on('keyup', '.edit', editKeyup)
				.on('focusout', '.edit', update)
				// .on('click', '.destroy', this.destroy.bind(this));
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
				let model = event_to_model(event)
				model.title = val
			}
	
			$(e.target).closest('li').removeClass('editing')
			engine.tick()  // ??
		}
		
		function destroy(e) {
			console.log(`controller for '${this.model_ref.title}' got DELETE user event from GUI ***`)
			this.model_ref.delete()  // we will eventually get a notification from the model to delete this controller instance
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

		function build() {
			let li = todoTemplate(data);
			let $res = _insert_gui(li, data.id);
			bind_events($res);
			// this.apply_filter(this.app.filter);
		}
		
		build()

		console.log(`controller-todoitem: ${entity.name}, ${JSON.stringify(data)}`);
	});

	// Boot

	engine.tick()

})(window);
