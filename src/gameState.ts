export let isCoopMode = false;
export let currentRoomId: string | null = null;

export function setCoopMode(value: boolean) {
    isCoopMode = value;
}

export function setCurrentRoomId(roomId: string | null) {
    currentRoomId = roomId;
}