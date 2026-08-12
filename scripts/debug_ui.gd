extends CanvasLayer

@onready var stage_label: Label = $VBoxContainer/StageLabel
@onready var total_label: Label = $VBoxContainer/TotalLabel
@onready var warning_label: Label = $VBoxContainer/WarningLabel
@onready var death_label: Label = $VBoxContainer/DeathLabel


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


func _on_stage_changed(new_stage: int) -> void:
	stage_label.text = "Стадия: %d/%d" % [new_stage, AgeManager.MAX_STAGE]


func _on_total_changed(total: int) -> void:
	total_label.text = "Съедено врагов: %d" % total


func _on_old_age_started(time_limit: float) -> void:
	warning_label.text = "Старость! Найди таблетку: %.1f сек." % time_limit
	warning_label.visible = true


func _on_rejuvenated(new_stage: int) -> void:
	warning_label.visible = false


func _on_player_died() -> void:
	warning_label.visible = false
	death_label.visible = true


func _on_game_reset() -> void:
	warning_label.visible = false
	death_label.visible = false
