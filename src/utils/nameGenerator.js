const adjectives = [
  'Swift','Bold','Calm','Brave','Wise','Sharp','Quiet','Bright','Dark','Wild',
  'Proud','Strong','Free','Kind','Pure','Red','Blue','Gold','Iron','Storm',
  'Frost','Flame','Stone','Wind','Thunder','Silver','Shadow','Amber','Crimson','Jade',
];

const animals = [
  'Lion','Tiger','Eagle','Wolf','Bear','Fox','Hawk','Deer','Bull','Owl',
  'Crow','Kite','Lynx','Puma','Crane','Swan','Raven','Cobra','Bison','Rhino',
  'Falcon','Panther','Leopard','Jaguar','Stallion','Buffalo','Peacock','Sparrow','Dolphin','Shark',
];

export const generateDisplayName = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${animal}#${number}`;
};

export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};