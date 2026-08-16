extends Node

signal stage_changed(new_stage)
signal total_eaten_changed(total)
signal old_age_started(time_limit)
signal player_died_old_age()
signal rejuvenated(new_stage)
signal game_reset()

const KILLS_PER_STAGE := 10
const MAX_STAGE := 5
const OLD_AGE_TIME := 5.0
const DEBUG_KEYS_ENABLED := true

enum State {
	ALIVE,
	OLD_AGE,
	DEAD
}

var stage := 1
var eaten_in_stage := 0
var total_eaten := 0
var state: State = State.ALIVE
var old_age_timer: Timer


func _ready() -> void:
	old_age_timer = Timer.new()
	old_age_timer.name = "OldAgeTimer"
	old_age_timer.one_shot = true
	old_age_timer.wait_time = OLD_AGE_TIME
	old_age_timer.timeout.connect(_on_old_age_timeout)
	add_child(old_age_timer)


func _unhandled_input(event: InputEvent) -> void:
	if not DEBUG_KEYS_ENABLED:
		return

	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_N:
				eat_enemy()
			KEY_P:
				eat_rejuvenating_pill(1)
			KEY_R:
				reset_game()


func eat_enemy() -> void:
	if state != State.ALIVE:
		return

	total_eaten += 1
	eaten_in_stage += 1

	total_eaten_changed.emit(total_eaten)

	if eaten_in_stage >= KILLS_PER_STAGE:
		eaten_in_stage = 0

		if stage < MAX_STAGE:
			stage += 1
			stage_changed.emit(stage)

			if stage == MAX_STAGE:
				_start_old_age()
		else:
			_start_old_age()


func eat_rejuvenating_pill(new_stage := 1) -> void:
	if state == State.DEAD:
		return

	old_age_timer.stop()

	state = State.ALIVE
	stage = clamp(new_stage, 1, MAX_STAGE)
	eaten_in_stage = 0

	stage_changed.emit(stage)
	rejuvenated.emit(stage)


func _start_old_age() -> void:
	state = State.OLD_AGE
	old_age_started.emit(OLD_AGE_TIME)
	old_age_timer.start()


func _on_old_age_timeout() -> void:
	if state != State.OLD_AGE:
		return

	state = State.DEAD
	player_died_old_age.emit()


func reset_game() -> void:
	old_age_timer.stop()

	state = State.ALIVE
	stage = 1
	eaten_in_stage = 0
	total_eaten = 0

	stage_changed.emit(stage)
	total_eaten_changed.emit(total_eaten)
	game_reset.emit()
