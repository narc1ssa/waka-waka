extends Resource
class_name RareEnemyConfig

@export var enemy_scene: PackedScene
@export var animation_name: String  # <- Верни это поле
@export var enemy_image: Texture2D
@export var reward: int = 5
@export var info_text: String = "Rare CAT!"
