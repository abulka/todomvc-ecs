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

	engine.system('controller-model', ['data'], (entity, { data }) => {
		// if (entity.name == 'model-welcome-message') $('input[name=welcome]').val(data.val)
		// else if (entity.name == 'model-firstname') $('input[name=firstname]').val(data.val)
		// else if (entity.name == 'model-surname') $('input[name=surname]').val(data.val)
		console.log(`controller-model: ${entity.name}, ${JSON.stringify(data)}`);
	});

	// Boot

	engine.tick()

})(window);
