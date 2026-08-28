extends CanvasLayer

@onready var stage_label: Label = $VBoxContainer/StageLabel
@onready var total_label: Label = $VBoxContainer/TotalLabel
@onready var warning_label: Label = $VBoxContainer/WarningLabel
@onready var death_label: Label = $VBoxContainer/DeathLabel

var current_time_limit := 0.0
var is_warning_active := false


func _ready() -> void:
	warning_label.visible = false
	death_label.visible = false

	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.total_eaten_changed.connect(_on_total_changed)
	AgeManager.old_age_started.connect(_on_old_age_started)
	AgeManager.rejuvenated.connect(_on_rejuvenated)
	AgeManager.player_died_old_age.connect(_on_player_died)
	AgeManager.game_reset.connect(_on_game_reset)

	_on_stage_changed(AgeManager.stage)
	_on_total_changed(AgeManager.total_eaten)


func _process(delta: float) -> void:
	if is_warning_active and current_time_limit > 0.0:
		current_time_limit -= delta

		if current_time_limit <= 0.0:
			current_time_limit = 0.0

		_update_warning_text()


func _on_stage_changed(new_stage: int) -> void:
	stage_label.text = "Стадия: %d/%d" % [new_stage, AgeManager.MAX_STAGE]


func _on_total_changed(total: int) -> void:
	total_label.text = "Коты: %d / %d" % [total, AgeManager.WIN_TOTAL]


func _on_old_age_started(time_limit: float) -> void:
	current_time_limit = time_limit
	is_warning_active = true
	warning_label.visible = true
	_update_warning_text()


func _on_rejuvenated(new_stage: int) -> void:
	is_warning_active = false
	warning_label.visible = false
	warning_label.modulate = Color.WHITE


func _on_player_died() -> void:
	is_warning_active = false
	warning_label.visible = false
	death_label.visible = true


func _on_game_reset() -> void:
	is_warning_active = false
	current_time_limit = 0.0
	warning_label.visible = false
	warning_label.modulate = Color.WHITE
	death_label.visible = false


func _update_warning_text() -> void:
	# Обновляем текст
	warning_label.text = "⏰ Найди домик: %.1f сек." % current_time_limit

	# Меняем цвет и добавляем мигание в зависимости от времени
	if current_time_limit <= 5.0:
		# Красное мигание в последние 5 секунд
		var alpha = 0.3 + 0.7 * abs(sin(Time.get_ticks_msec() * 0.015))
		warning_label.modulate = Color(1.0, 0.2, 0.2, alpha)
	elif current_time_limit <= 15.0:
		# Жёлтый цвет в последние 15 секунд
		warning_label.modulate = Color(1.0, 0.9, 0.2, 1.0)
	else:
		# Белый цвет, когда времени много
		warning_label.modulate = Color.WHITE
