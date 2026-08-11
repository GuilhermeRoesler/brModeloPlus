export const generateId = () => Math.random().toString(36).substring(2, 11);

export const getRoomIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
};

export const setRoomInUrl = (roomId: string | null) => {
  const newUrl = roomId
    ? `${window.location.pathname}?room=${roomId}`
    : window.location.pathname;
  window.history.pushState({ path: newUrl }, '', newUrl);
};
