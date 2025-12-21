export function applyDamage(enemy, amount, dmgType) {
  // dmgType: "phys" | "magic"
  let mult = 1;
  if (dmgType === "phys") {
    mult = 1 - enemy.armor;      // armor: 0..1
  } else if (dmgType === "magic") {
    mult = 1 - enemy.mResist;    // mResist: 0..1
  }
  const dealt = amount * (mult < 0 ? 0 : mult);
  enemy.hp -= dealt;
  return dealt;
}

