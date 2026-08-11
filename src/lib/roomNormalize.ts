import { getNodeSize } from './nodeGeometry';
import type { RoomData } from '../types';

/**
 * Garante `coordSpace: 'topLeft'`.
 * Salas legadas (centro / sem campo) são convertidas uma vez na leitura.
 */
export const normalizeRoomData = (data: RoomData): RoomData => {
  if (data.coordSpace === 'topLeft') {
    return data;
  }

  const nodes = (data.nodes ?? []).map((n) => {
    const size = getNodeSize(n);
    return {
      ...n,
      x: n.x - size.width / 2,
      y: n.y - size.height / 2,
    };
  });

  return {
    ...data,
    nodes,
    connections: data.connections ?? [],
    coordSpace: 'topLeft',
  };
};
