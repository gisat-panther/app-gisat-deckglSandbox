// src/maps/MapApp1.jsx
import { useEffect, useState } from 'react';
import { DeckGL } from 'deck.gl';
import { MapView } from '@deck.gl/core';
import { TileLayer } from '@deck.gl/geo-layers';
import {BitmapLayer, IconLayer} from '@deck.gl/layers';
import {scaleLinear} from 'd3-scale';
import {OBJLoader} from '@loaders.gl/obj';
import { MVTLayer } from "@deck.gl/geo-layers";
import * as dat from 'dat.gui';
import {SimpleMeshLayer} from "@deck.gl/mesh-layers";
import chroma from "chroma-js";
import geolib from "@gisatcz/deckgl-geolib";
import {_TerrainExtension as TerrainExtension, DataFilterExtension} from '@deck.gl/extensions';

const CogTerrainLayer = geolib.CogTerrainLayer;

const INITIAL_VIEW_STATE = {
    longitude: 14.015511800867504,
    latitude: 50.571906640192161,
    zoom: 13,
    pitch: 20,
    bearing: 0,
};

const colorScale = chroma
    .scale(['#b1001d', '#ca2d2f', '#e25b40', '#ffaa00', '#ffff00', '#a0f000', '#4ce600', '#50d48e', '#00c3ff', '#0f80d1', '#004ca8', '#003e8a'])
    .domain([-5, 5]);

// const sphereSizeScale = scaleLinear([0.45, 1], [2, 9]).clamp(true);
// const scaleXYArrowWidth = scaleLinear([0.1, 20], [0.1 , 0.3*1000]).clamp(true);
// const scaleZArrowLength = scaleLinear([0.1, 20], [0.05, 2*1000]).clamp(true);
//
// const ARROW_SIZE = 67; // eyeball measured, only for this object: https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/arrow_v3.obj

const insarPointRelLenThresholdInterval = [0.45, 1000000];

// for vel_rel attribute
// const iconScale = scaleLinear([0,5], [10,18]).clamp(true)

const arrow2DiconScale = scaleLinear([0,30], [10,40]).clamp(true)
const meshIconVelLastScale= scaleLinear([0,30], [50,500]).clamp(true)
const meshIconRelLenScale= scaleLinear([0,1], [1,200]).clamp(true)

// based on vel_last
const getLength = (num) => {
    if (num < 3) {
        return 1;
    } else if (num >= 3 && num <= 10) {
        return 2;
    } else if (num > 10) {
        return 3;
    }
};

// based on rel_len
const getWidth = (num) => {
    if (num < 0.36) {
        return 1;
    } else if (num >= 0.36 && num <= 0.7) {
        return 2;
    } else if (num > 0.7) {
        return 3;
    }
};

const arrowIconOptions = {
    data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_selected_arrows.geojson',
    getColor: (d) => [...colorScale(d.properties.vel_rel).rgb(), 255],
    getIcon: (d) => {
        let length = getLength(Math.abs(d.properties.vel_last));
        let width = getWidth(d.properties.rel_len);
        let type = d.properties.vel_rel > 0 ? 'o' : 'f';
        let direction ='r';
        // let direction = d.properties.vel_rel > 0 ? 'r' : 'l';

        return `arrow_${direction}_l${length}_w${width}_${type}`
    },
    // getIcon: (d) =>'right-arrow',
    getPosition: (d) => [...d.geometry.coordinates, 1],
    // getAngle: (d) => 90 - (180 + d.properties.az_ang),
    // getAngle: (d) => 90 - (d.properties.az_ang),
    getAngle: (d) => {
        const arrowRotation = 90 - (180 + d.properties.az_ang);
        return d.properties.vel_rel < 0 ? arrowRotation : arrowRotation + 180;
    },

    billboard: false,
    sizeUnits: "meters",
    // getSize: (d) => iconScale(Math.abs(d.properties.vel_last)),
    getSize: 20,
    // mask: true,
    // iconAtlas: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/right-arrow-atlas.png',
    iconAtlas: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/icon_atlas/v4/arrow-atlas-v4.png',
    // iconMapping: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/right-arrow-atlas.json',
    iconMapping: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/icon_atlas/v4/arrow-atlas-v4.json',
    getFilterValue: d => (d.properties.rel_len),
    filterRange: insarPointRelLenThresholdInterval,
    extensions: [new DataFilterExtension({filterSize: 1}), new TerrainExtension()],
    // extensions: [],
    visible: false,
}

// Layer configurations
const layerConfigs = [
    {
        id: 'tile-layer',
        type: TileLayer,
        options: {
            visible:true,
            data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            renderSubLayers: (props) => {
                const { bbox: { west, south, east, north } } = props.tile;
                return new BitmapLayer(props, {
                    data: null,
                    image: props.data,
                    bounds: [west, south, east, north],
                });
            },
        },
        name: 'Basemap',
    },
    {
        id: 'insar-points-arrow-mesh',
        type: SimpleMeshLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_height_mesh_v3.json',
            mesh: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/arrow_filled.obj',
            id: 'insar-points-arrow-mesh',
            getColor: (d) => [...colorScale(d.properties.vel_rel).rgb(), 255],
            // [0,azimuth (horizontalni) - aby sipka ukazovala nahoru, hodnota je 90, hodnota 90 - aby sipka byla placata]
            getOrientation: (d) => [0,90 - (180 + d.properties.az_ang),90],
            getPosition: (d) => [d.geometry.coordinates[0], d.geometry.coordinates[1], d.properties.h_dtm + 2],
            // getPosition: (d) => [d.geometry.coordinates[0], d.geometry.coordinates[1], 1],
            getScale: (d) => {
                // [delka sipky, tloustka ve 3d - nema smysl pro 2d sipky, sirka sipky]
                return [meshIconVelLastScale(Math.abs(d.properties.vel_last)), 1, meshIconRelLenScale(Math.abs(d.properties.rel_len))]
                // if (d.properties.vel_rel > 0) {
                //     return [scaleXYArrowWidth(d.properties.vel_rel), scaleXYArrowWidth(d.properties.vel_rel), scaleZArrowLength(d.properties.vel_rel)];
                // }
                // return [scaleXYArrowWidth(Math.abs(d.properties.vel_rel)), scaleXYArrowWidth(Math.abs(d.properties.vel_rel)), scaleZArrowLength(Math.abs(d.properties.vel_rel))];
            },
            loaders: [OBJLoader],
            getFilterValue: d => d.properties.rel_len,
            filterRange: insarPointRelLenThresholdInterval,
            // pickable: true,
            extensions: [new DataFilterExtension({filterSize: 1})],
            visible: false,
        },
        name: 'arrows mesh',
    },
    {
        id: 'insar-points-mvt',
        type: MVTLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_height_v3/{z}/{x}/{y}.pbf',
            binary: false,
            id: `insarpoints`,
            getFilterValue: d => [d.properties.rel_len, Math.abs(d.properties.vel_last)],
            filterRange: [insarPointRelLenThresholdInterval, [0.001,100]],
            extensions: [new DataFilterExtension({filterSize: 2})],
            visible: true,
            minZoom: 8,
            maxZoom: 14,
        },
        name: 'insar points MVT',
    },
    {
        id: 'insar-points-arrow-icon-mvt-los',
        type: MVTLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_height_v3/{z}/{x}/{y}.pbf',
                binary: false,
                renderSubLayers: (props) => {
                    if (props.data) {
                        return new IconLayer({
                            ...arrowIconOptions,
                            ...props,
                            getIcon: d => (d.properties.vel_last !== null ? 'right-arrow' : ''),
                            getSize: d => arrow2DiconScale(Math.abs(d.properties.vel_last)) || 0,
                            iconAtlas:
                                'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/icon_atlas/v1/right-arrow-atlas.png',
                            iconMapping:
                                'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/icon_atlas/v1/right-arrow-atlas.json',
                            id: `${props.id}-icon`,
                            getFilterValue: d => d.properties.rel_len,
                            filterRange: insarPointRelLenThresholdInterval,
                            extensions: [new DataFilterExtension({filterSize: 1})],
                        });
                    }
                    return null;
                },
                visible: true,
                minZoom: 8,
                maxZoom: 14,
        },
        name: 'arrows MVT LOS',
    },
    {
        id: 'insar-points-arrow-icon-mvt-dts',
        type: MVTLayer,
        options: {
            data: 'https://gisat-gis.eu-central-1.linodeobjects.com/3dflus/d8/InSAR/trim_d8_DESC_upd3_psd_los_4326_height_v3/{z}/{x}/{y}.pbf',
            binary: false,
            renderSubLayers: (props) => {
                if (props.data) {
                    return new IconLayer({
                        ...arrowIconOptions,
                        ...props,
                        id: `${props.id}-icon`,
                        getFilterValue: d => d.properties.rel_len,
                        filterRange: insarPointRelLenThresholdInterval,
                        extensions: [new DataFilterExtension({filterSize: 1})],
                    });
                }
                return null;
            },
            visible: false,
            minZoom: 8,
            maxZoom: 14,
        },
        name: 'arrows MVT DTS',
    },
    {
        id: 'CogTerrainLayerCUZK',
        type: CogTerrainLayer,
        options: {
            elevationData:  'https://gisat-data.eu-central-1.linodeobjects.com/3DFlus_GST-22/app-esa3DFlusPilot3Geology/dev/rasters/EL-GRID_COGeoN.tif',
            minZoom: 12,
            maxZoom: 14,
            opacity: 1,
            isTiled: true,
            useChannel: null,
            tileSize: 256,
            meshMaxError: 1,
            visible: false,
            operation: 'terrain+draw',
            terrainOptions: {
                type: 'terrain',
                multiplier: 1,
                terrainSkirtHeight: 1,
            }
        },
        name: 'DTM CUZK 5m',
    },
];

// Function to create a layer based on its configuration, visibility, and properties
const createLayer = (config, visibility, properties) => {
    const options = { ...config.options, id: config.id, visible: visibility };
    if (properties) {
        Object.keys(properties).forEach((key) => {
            options[key] = properties[key];
        });
    }
    return new config.type(options);
};

function MapApp1() {
    // Initial visibility state and layer properties for all layers
    const initialVisibility = layerConfigs.reduce((acc, config) => {
        acc[config.id] = config.options.visible;
        return acc;
    }, {});

    const initialProperties = layerConfigs.reduce((acc, config) => {
        if (config.controls) {
            acc[config.id] = {};
            Object.keys(config.controls).forEach(key => {
                acc[config.id][key] = config.options[key];
            });
        }
        return acc;
    }, {});

    const [layerVisibility, setLayerVisibility] = useState(initialVisibility);
    const [layerProperties, setLayerProperties] = useState(initialProperties);

    // Update the layers array based on visibility and properties state
    const layers = layerConfigs.map(config => createLayer(config, layerVisibility[config.id], layerProperties[config.id]));

    useEffect(() => {
        // Initialize dat.gui
        const gui = new dat.GUI();

        // Add visibility controls for each layer
        layerConfigs.forEach(config => {
            gui.add(layerVisibility, config.id).name(config.name).onChange((value) => {
                setLayerVisibility((prevState) => ({
                    ...prevState,
                    [config.id]: value,
                }));
            });
        });

        // Cleanup dat.gui on unmount
        return () => {
            gui.destroy();
        };
    }, []);

    return (
        <DeckGL
            initialViewState={INITIAL_VIEW_STATE}
            controller={true}
            views={new MapView({ repeat: true })}
            layers={layers}
            className="deckgl-map"
        >
        </DeckGL>
    );
}

export default MapApp1;
