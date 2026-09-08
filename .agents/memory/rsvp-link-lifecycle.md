---
name: Cycle de vie des liens RSVP
description: Garanties de révocation, de réémission et de cohérence opérationnelle des réponses participantes.
---

Un lien RSVP révoqué ne doit jamais redevenir valide avec le même jeton. Toute réémission fait tourner le jeton public tout en conservant la réponse déjà enregistrée.

La révocation retire seulement le droit de répondre par ce lien : elle ne retire jamais la réponse des projections opérationnelles. Les chargements de réponses doivent rester isolés par compte et par Monde.

La projection participante reste une liste blanche étroite. Une visibilité explicitement privée est toujours prioritaire sur une relation à l’invité ; relier une personne à un Moment privé ne suffit jamais à le publier dans son portail.

**Why:** le jeton est un droit d’accès public détenu par son destinataire ; le réutiliser annule en pratique la révocation, tandis qu’effacer la réponse détruit une décision humaine déjà confirmée.

**How to apply:** vérifier que l’ancien lien reste refusé après réémission, que le nouveau lien retrouve la réponse, que la réponse reste visible après révocation, qu’un Moment privé relié reste absent du portail, et qu’aucun chargement tardif d’un autre contexte ne peut contaminer Personnes, le placement ou les exports.