extends CanvasLayer

@onready var pause_panel: Panel = $PausePanel


func _ready() -> void:
	# Работает и во время паузы, и без неё.
	process_mode = Node.PROCESS_MODE_ALWAYS

	pause_panel.visible = false

	$PausePanel/ResumeButton.pressed.connect(_on_resume)
	$PausePanel/RestartButton.pressed.connect(_on_restart)
	$PausePanel/MenuButton.pressed.connect(_on_menu)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		if AgeManager.state == AgeManager.State.DEAD or AgeManager.state == AgeManager.State.WON:
			return

		if get_tree().paused:
			_on_resume()
		else:
			_pause()


func _pause() -> void:
	get_tree().paused = true
	pause_panel.visible = true


func _on_resume() -> void:
	get_tree().paused = false
	pause_panel.visible = false


func _on_restart() -> void:
	get_tree().paused = false
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/Main.tscn")


func _on_menu() -> void:
	get_tree().paused = false
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
