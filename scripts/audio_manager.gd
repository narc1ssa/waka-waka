extends Node

@onready var menu_music: AudioStreamPlayer = $MenuMusic
@onready var level_music: AudioStreamPlayer = $LevelMusic
@onready var old_age_music: AudioStreamPlayer = $OldAgeMusic
@onready var eat_sound: AudioStreamPlayer = $EatSound
@onready var win_music: AudioStreamPlayer = $WinMusic

var current_music: AudioStreamPlayer = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	stop_music()


func play_menu_music() -> void:
	_switch_music(menu_music)


func play_level_music() -> void:
	_switch_music(level_music)


func play_old_age_music() -> void:
	_switch_music(old_age_music)
	
func play_win_music() -> void:
	_switch_music(win_music)


func stop_music() -> void:
	menu_music.stop()
	level_music.stop()
	old_age_music.stop()
	win_music.stop()
	current_music = null


func _switch_music(player: AudioStreamPlayer) -> void:
	if current_music == player:
		return

	if current_music:
		current_music.stop()

	current_music = player

	if player.stream:
		player.play()


func play_eat_sfx() -> void:
	if eat_sound.stream == null:
		return

	# Новый плеер на каждый звук, чтобы звуки могли перекрываться.
	var p := AudioStreamPlayer.new()
	p.stream = eat_sound.stream
	p.volume_db = eat_sound.volume_db
	add_child(p)
	p.play()
	p.finished.connect(p.queue_free)
