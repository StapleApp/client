import Draggable from "react-draggable";
import {useState, useRef, useCallback } from "react";

const DraggableMenu = () => {
    const [isDraggable, setIsDraggable] = useState(false);
    const nodeRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Orijinal konum

    // Hedef nokta (orijinal konum)
    const TARGET_POSITION = { x: 0, y: 0 };
    const SNAP_DISTANCE = 75; // Yakınlık eşiği (75px içinde ise yerine oturacak)

    // Bırakılınca yerine oturtma işlemi
    const handleStop = useCallback((data) => {
        const distance = Math.sqrt(
        Math.pow(data.x - TARGET_POSITION.x, 2) + Math.pow(data.y - TARGET_POSITION.y, 2)
        );

        if (distance < SNAP_DISTANCE) {
        setPosition(TARGET_POSITION); // Eğer yakınsa, yerine oturt
        setIsDraggable(false); // Sabitle
        } else {
        setPosition({ x: data.x, y: data.y }); // Uzaksa, olduğu yerde bırak
        }
    }, []);

    return(
        <>
            <div className="w-screen h-screen flex flex-col items-center justify-center gap-4">
            <button
                onClick={() => setIsDraggable(!isDraggable)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
                {isDraggable ? "Sabit Yap" : "Hareket Ettir"}
            </button>

            <Draggable
                nodeRef={nodeRef}
                disabled={!isDraggable}
                position={position}
                onStop={handleStop} // Sürükleme bırakıldığında kontrol et
            >
                <div
                ref={nodeRef}
                className={`w-20 h-20 rounded-lg flex items-center justify-center transition-all ${
                    isDraggable ? "bg-green-500 cursor-move" : "bg-red-500"
                }`}
                >
                {isDraggable ? "Sürükle" : "Sabit"}
                </div>
            </Draggable>
            </div>
        </>
    );   
};
  
export default DraggableMenu;