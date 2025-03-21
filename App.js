import React, { useRef, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, SafeAreaView, StyleSheet, Text, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, Layout, runOnJS, SlideInDown, SlideOutUp, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export function RenderToolbarButton(
    { 
        item, 
        index, 
        activeY, 
        height, 
        activeItemIndex,
        scrollOffset,
        toolbarY,
        move_tool_bar_y,
        isLeftHanded
    }) {
    
    // Use useDerivedValue instead of useSharedValue to dynamically update with scrollOffset
    const visibleTop = useDerivedValue(() => {
        return index * height - scrollOffset.value;
    });
    
    const visibleBottom = useDerivedValue(() => {
        return (index + 1) * height - scrollOffset.value;
    });
    
    const isItemActive = useDerivedValue(() => {
        // If some other item is locked
        if (activeItemIndex.value !== -1 && activeItemIndex.value !== index) {
            return false;
        }
        
        // Only activate if activeY is valid (> 0)
        if (activeY.value <= 0) return false;
        
        // Get touch position relative to scrollview
        const touchInScrollView = activeY.value - (toolbarY + move_tool_bar_y.value);
        
        // Check if touch is within visible bounds of this item
        return touchInScrollView >= visibleTop.value && touchInScrollView <= visibleBottom.value;
    });

    useAnimatedReaction(
        () => isItemActive.value,
        (active) => {
            if (active && activeItemIndex.value === -1) {
                console.log("Active Item: ", index);
                activeItemIndex.value = index;

                // if it has a func then execute it
                if (item.func) {
                    runOnJS(item.func)();  // <--- use runOnJS here
                }
            }
        }
    );


    const textStyle = useAnimatedStyle(() => {
        const isActive = activeItemIndex.value === index;
        return {
            opacity: withTiming(isActive ? 1 : 0, { duration: 200 }),
            width: withTiming(isActive ? 150 : 0, { duration: 200 }),
        };
    });

    const iconStyle = useAnimatedStyle(() => {
        const isActive = activeItemIndex.value === index;
        return {
            transform: [
                // { scale: withTiming(isActive ? 1.1 : 1, { duration: 200 }) }
            ]
        };
    });


    return (
        <View
            style={[
                styles.toolbarButtonWrapper,
                { alignSelf: isLeftHanded ? 'flex-start' : 'flex-end' }
            ]}
        >
            <Animated.View
                style={[
                    styles.iconContainer,
                    { backgroundColor: item.color },
                    iconStyle,
                ]}
            >
                <Ionicons name={item.icon} size={24} color="white" style={{ padding: 10 }} />
            </Animated.View>

            <Animated.View 
                style={[
                    styles.textContainer,
                    { 
                        backgroundColor: item.color,
                        [isLeftHanded ? 'left' : 'right']: 35
                    },
                    textStyle
                ]}
            >
                <Text 
                    style={styles.buttonTitle}
                >
                    {item.title}
                </Text>
            </Animated.View>
        </View>
    )
}

export default function App() {

    const { width, height } = Dimensions.get('window');
    const [isLeftHanded, setIsLeftHanded] = useState(false);

    const [isToolbarOpen, setIsOpen] = useState(false);
    const toggleToolbar = () => {
        setIsOpen(!isToolbarOpen);
    }

    /*
    *   This component will render a scrolling toolbar with multiple buttons.
    *   Each button will have a title and an icon.
    */
    const ToolBarButtons = [
        { title: "Close", icon: "close-circle-outline", color: "#FF0000", func: toggleToolbar }, // Red
        { title: "Refresh", icon: "refresh-circle-outline", color: "#1E90FF" }, // DodgerBlue
        { title: "Start Auto Refresh", icon: "play-circle-outline", color: "#32CD32" }, // LimeGreen
        { title: "Clear Alerts", icon: "trash-outline", color: "#FF4500" }, // OrangeRed
        { title: "Toggle 3D", icon: "cube-outline", color: "#FFD700" }, // Gold
        { title: "Toggle Follow", icon: "compass-outline", color: "#8A2BE2" }, // BlueViolet
        { title: "Show Filters", icon: "funnel-outline", color: "#17A2B8" },
    ];

    const ToolBarButtonsClosed = [
        { title: "Open", icon: "chevron-up-outline", color: "#FF0000", func: toggleToolbar }, // Red
    ];


    /*
        This is used to calculate the position of the toolbar from the top of the screen, this is so that we know where the begining of the toolbar
        is and can use it to determine where you tap
    */
    const [toolbarY, setToolbarY] = useState(0);
    const toolbarRef = useRef(null);

    const activeY = useSharedValue(0);
    const activeItemIndex = useSharedValue(-1);
    const scrollOffset = useSharedValue(0);

    // Drag Gesture for the toolbar
    const dragGesture = Gesture.Pan()
    .onStart(e => {
        activeY.value = e.absoluteY;
    })
    .onUpdate(e => {
        activeY.value = e.absoluteY;
    })
    .onEnd(_ => {
        // Reset on end
        activeY.value = 0;
        activeItemIndex.value = -1;
    });


    const move_tool_bar_x = useSharedValue(0);
    const move_tool_bar_y = useSharedValue(0);
    const offsetX = useSharedValue(0);
    const offsetY = useSharedValue(0);

    const updateHandedness = (absoluteX) => {
        try {
            if (typeof absoluteX === 'number' && !isNaN(absoluteX)) {
                setIsLeftHanded(absoluteX < width / 2);
            }
        } catch (error) {
            console.warn('Error updating handedness:', error);
        }
    };

    const move_tool_bar = Gesture.Pan()
    .onUpdate(e => {
        move_tool_bar_x.value = offsetX.value + e.translationX;
        move_tool_bar_y.value = offsetY.value + e.translationY;
    })
    .onEnd((e) => {
        //offsetX.value = move_tool_bar_x.value;
        //offsetY.value = move_tool_bar_y.value;
        // offsetX.value = withTiming(move_tool_bar_x.value);
        // offsetY.value = withTiming(move_tool_bar_y.value);
        offsetX.value = withSpring(move_tool_bar_x.value);
        offsetY.value = withSpring(move_tool_bar_y.value);
        runOnJS(updateHandedness)(e.absoluteX);

    });

    const move_tool_bar_style = useAnimatedStyle(() => ({
        transform: [
            { translateX: move_tool_bar_x.value },
            { translateY: move_tool_bar_y.value },
        ]
    }));


    const headerHeight = 100;

    const renderToolBarButton = () => {
        return (
            <Animated.View 
                ref={toolbarRef}
                style={[
                    styles.toolBarContainer, 
                    { top: headerHeight },
                    move_tool_bar_style
                ]}
                onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    setToolbarY(y);
                }}
            >
                <Animated.ScrollView
                    contentContainerStyle={{ padding: 2 }}
                    scrollEventThrottle={16}
                    onScroll={useAnimatedScrollHandler({
                        onScroll: (e) => {
                            scrollOffset.value = e.contentOffset.y;
                        },
                    })}
                    showsVerticalScrollIndicator={false}
                    style={[ 
                        {overflow: 'visible'}, 

                    ]}
                >
                    {(isToolbarOpen ? ToolBarButtons : ToolBarButtonsClosed).map((button, index) => (
                        <Animated.View
                            key={`toolbar-${index}`}
                            entering={FadeIn.delay(index * 100).springify()}
                            exiting={FadeOut.duration(200)}
                            layout={Layout.springify()} 
                        >
                            <RenderToolbarButton
                                item={button}
                                index={index}
                                scrollOffset={scrollOffset}
                                activeY={activeY}
                                height={50}
                                activeItemIndex={activeItemIndex}
                                toolbarY={toolbarY}
                                move_tool_bar_y={move_tool_bar_y}
                                isLeftHanded={isLeftHanded}
                            />
                        </Animated.View>
                    ))}
                    { /* Reorder To Move Around the Screen */}
                </Animated.ScrollView>
                <GestureDetector gesture={move_tool_bar}>
                    <Image source={require('./assets/drag.png')} style={{ width: 50, height: 50 }} />
                </GestureDetector>
            </Animated.View>
        )
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <GestureDetector gesture={dragGesture}>
                    {renderToolBarButton()}
                </GestureDetector>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    toolBarContainer: {
        position: 'absolute',
        right: 20,
        width: 50,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 5,
        zIndex: 100,
        minWidth: 50,   
        width: 'auto', 
        overflow: 'visible',
    },
    buttonTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    textContainer: {
        position: 'absolute',
        height: 50,
        paddingHorizontal: 15,
        borderRadius: 12,
        justifyContent: 'center',
        zIndex: 103
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 102,

    },
    toolbarButtonWrapper: { height: 50, position: 'relative',
        width: '100%',
        overflow: 'visible',
        zIndex: 101,
    },
});
