export const generateId = () => Math.random().toString(36).substring(2, 11);

export const getRandomColor = () => {
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
  return colors[Math.floor(Math.random() * colors.length)];
};

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
