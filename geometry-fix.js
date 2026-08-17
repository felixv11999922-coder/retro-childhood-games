'use strict';
(function(){
  const G=window.GameData;
  if(!G) throw new Error('GameData не загружен');
  G.FIELD_W=600;
  G.FIELD_H=600;
  G.OFFSET_X=(600-G.COLS*G.TILE_SIZE)/2;
  G.OFFSET_Y=(600-G.ROWS*G.TILE_SIZE)/2;
  console.info('Tank Base v14.8: square world geometry active',G.FIELD_W,G.FIELD_H,G.OFFSET_X,G.OFFSET_Y);
})();
