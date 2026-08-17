extends Area2D

# Если 0 - таблетка живёт бесконечно.
@export var lifetime := 10.0

# Пульсация, чтобы таблетка была заметнее.
@export var pulse := true


func _ready() -> void:
	add_to_group("pill")

	# Таблетка сама ничего не ищет.
	# Её ищет EatArea игрока.
	monitoring = false
	monitorable = true

	if lifetime > 0.0:
		_setup_lifetime_timer()

	if pulse:
		_start_pulse()


func eat() -> void:
	queue_free()


func _setup_lifetime_timer() -> void:
	var timer := Timer.new()
	timer.name = "LifetimeTimer"
	timer.wait_time = lifetime
	timer.one_shot = true
	timer.timeout.connect(queue_free)
	add_child(timer)
	timer.start()


func _start_pulse() -> void:
	var visual := get_node_or_null("Visual")

	if not visual:
		return

	var tween := create_tween()
	tween.set_loops()

	tween.tween_property(
		visual,
		"scale",
		Vector2.ONE * 1.15,
		0.3
	)

	tween.tween_property(
		visual,
		"scale",
		Vector2.ONE,
		0.3
	)
