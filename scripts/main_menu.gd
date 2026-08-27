extends Control


func _ready() -> void:
	AudioManager.play_menu_music()
	$PlayButton.pressed.connect(_on_play)
	$QuitButton.pressed.connect(_on_quit)


func _on_play() -> void:
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/Main.tscn")


func _on_quit() -> void:
	get_tree().quit()
