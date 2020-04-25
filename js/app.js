(function (window) {
	'use strict';

	// Your starting point. Enjoy the ride!

	// Instantiating engine, timer and simulator
	const engine = new Jecs.Engine();
	const util = new Util();

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
		// if (entity.name == 'model-welcome-message') $('input[name=welcome]').val(data.val)
		// else if (entity.name == 'model-firstname') $('input[name=firstname]').val(data.val)
		// else if (entity.name == 'model-surname') $('input[name=surname]').val(data.val)

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
			// this.bind_events($res);
			// this.apply_filter(this.app.filter);
		}
		
		build()

		console.log(`controller-todoitem: ${entity.name}, ${JSON.stringify(data)}`);
	});

	// Boot

	engine.tick()

})(window);
