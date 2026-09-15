extends Node2D

@export var pill_scene: PackedScene

# Спавнить таблетку, когда началась старость.
@export var spawn_on_old_age := true

# Спавнить таблетку заранее на определённой стадии.
# Для 5 стадий хорошо использовать 4 или 5.
# Если 0 - не спавнить по стадии.
@export var spawn_at_stage := 4

# Сколько таблеток одновременно может быть на уровне.
@export var max_active_pills := 2

# Отладочная клавиша для ручного спавна таблетки.
@export var debug_spawn_key := KEY_B

# Отладочная клавиша для установки 290 котов (для теста победы)
@export var debug_victory_key := KEY_V

var ground: Sprite2D
var player_camera: Camera2D
var items: Node2D
var pill_spawn_points: Node2D

# Ссылки на UI
@onready var victory_ui = $VictoryUI
@onready var game_over_ui = $GameOverUI
@onready var final_collection_screen = $FinalCollectionScreen

var active_pills := []
var show_tutorial := true


func _ready() -> void:
	ground = get_node_or_null("Ground")
	player_camera = get_node_or_null("Player/Camera2D")
	items = get_node_or_null("Items")
	pill_spawn_points = get_node_or_null("PillSpawnPoints")

	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.old_age_started.connect(_on_old_age_started)
	AgeManager.game_reset.connect(_on_game_reset)
	AgeManager.player_died_old_age.connect(_on_player_died)
	
	# Проверяем победу при изменении количества котов
	AgeManager.cats_collected_changed.connect(_on_cats_collected_changed)
	
	AudioManager.play_level_music()

	AgeManager.old_age_started.connect(_on_old_age_music)
	AgeManager.rejuvenated.connect(_on_level_music)
	AgeManager.game_reset.connect(_on_level_music)
	AgeManager.player_died_old_age.connect(_on_death_music)


func _on_old_age_music(_time_limit: float) -> void:
	AudioManager.play_old_age_music()


func _on_level_music(_a = null) -> void:
	AudioManager.play_level_music()


func _on_death_music() -> void:
	AudioManager.stop_music()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == debug_spawn_key:
			spawn_pill()
		
		# === ОТЛАДКА: установить 290 котов ===
		if event.keycode == debug_victory_key:
			print("🎮 DEBUG: Установлено 290 котов (для теста победы)")
			
			# Сбрасываем состояние в ALIVE, чтобы eat_enemy() работал
			AgeManager.state = AgeManager.State.ALIVE
			AgeManager.total_eaten = 290
			AgeManager.stage = 1  # Остаёмся на 1 стадии
			AgeManager.eaten_in_stage = 0  # Сбрасываем счётчик стадии
			
			# Эмитим сигналы, чтобы UI обновился
			AgeManager.cats_collected_changed.emit(290)
			AgeManager.total_eaten_changed.emit(290)
			AgeManager.stage_changed.emit(1)
			
			print("🐱 Всего котов: ", AgeManager.total_eaten)
			print("📊 Стадия: ", AgeManager.stage)
			print("🎯 Состояние: ", AgeManager.state)


func _on_stage_changed(new_stage: int) -> void:
	if spawn_at_stage > 0 and new_stage == spawn_at_stage:
		spawn_pill()


func _on_old_age_started(_time_limit: float) -> void:
	if spawn_on_old_age:
		spawn_pill()


func should_show_tutorial() -> bool:
	return show_tutorial

func _on_game_reset() -> void:
	clear_pills()
	show_tutorial = false  # Не показывать инструкции при рестарте


func _on_cats_collected_changed(new_count: int) -> void:
	# Проверяем условие победы (300 котов)
	if new_count >= 300:
		print("🏆 ПОБЕДА! Собрано ", new_count, " котов!")
		_on_player_won()


func _on_player_died() -> void:
	print("💀 Игрок умер от старости")
	_on_death_music()
	
	# Ждём окончания анимации смерти игрока
	var player := get_node_or_null("Player")
	if player and player.has_signal("death_finished"):
		print("⏳ Ждём окончания анимации смерти...")
		await player.death_finished
		print("✅ Анимация смерти завершена")
		# Небольшая пауза, чтобы игрок увидел последний кадр
		await get_tree().create_timer(0.5).timeout
	
	# Показываем экран проигрыша
	if game_over_ui and game_over_ui.has_method("show_game_over"):
		game_over_ui.show_game_over()


func _on_player_won() -> void:
	print("🎉 Вызов экрана победы!")
	# Показываем экран победы
	if victory_ui and victory_ui.has_method("show_victory"):
		victory_ui.show_victory()


func spawn_pill() -> void:
	if pill_scene == null:
		push_warning("Pill scene is not assigned in Main")
		return

	_cleanup_pills()

	if active_pills.size() >= max_active_pills:
		return

	var spawn_position := Vector2.ZERO

	if pill_spawn_points:
		var points := pill_spawn_points.get_children()

		if not points.is_empty():
			var point := points.pick_random() as Node2D

			if point:
				spawn_position = point.global_position

	else:
		var player := get_node_or_null("Player")

		if player:
			spawn_position = player.global_position + Vector2(64, 0)

	var pill := pill_scene.instantiate()

	var parent: Node = self

	if items:
		parent = items

	parent.add_child(pill)

	pill.global_position = spawn_position

	active_pills.append(pill)

	pill.tree_exiting.connect(_on_pill_removed.bind(pill))


func _on_pill_removed(pill: Node) -> void:
	active_pills.erase(pill)


func _cleanup_pills() -> void:
	var valid_pills := []

	for pill in active_pills:
		if is_instance_valid(pill):
			valid_pills.append(pill)

	active_pills = valid_pills


func clear_pills() -> void:
	for pill in active_pills:
		if is_instance_valid(pill):
			pill.queue_free()

	active_pills.clear()
