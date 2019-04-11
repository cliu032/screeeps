var roleHarvester = require('role.harvester');
var roleUpgrader = require('role.upgrader');
var roleBuilder = require('role.builder');
var roleCarrier = require('role.carrier');
var roleRepairer = require('role.repairer');

const maxHarvesterWorkCount = 5;

let currentRoom = Game.spawns['Spawn1'].room;
let extensions = currentRoom.find(FIND_MY_STRUCTURES, { filter: (s) => s.structureType == STRUCTURE_EXTENSION });
let constructionExtensions = currentRoom.find(FIND_MY_CONSTRUCTION_SITES, { filter: (s) => s.structureType == STRUCTURE_EXTENSION });
let maxExtensionCount = CONTROLLER_STRUCTURES['extension'][currentRoom.controller.level];
let totalExtensions = extensions.length + constructionExtensions.length;
console.log('Extension: ' + totalExtensions + '/' + maxExtensionCount);
if (totalExtensions < maxExtensionCount) {
    let newExtensionCount = maxExtensionCount - totalExtensions;
    const spawnPos = Game.spawns['Spawn1'].pos;
    const extensionDistance = 1;
    let newExtensionPosList = [
        new RoomPosition(spawnPos.x+extensionDistance, spawnPos.y+extensionDistance, currentRoom.name),
        new RoomPosition(spawnPos.x-extensionDistance, spawnPos.y+extensionDistance, currentRoom.name),
        new RoomPosition(spawnPos.x+extensionDistance, spawnPos.y-extensionDistance, currentRoom.name),
        new RoomPosition(spawnPos.x-extensionDistance, spawnPos.y-extensionDistance, currentRoom.name),
    ];
    for (let i = 0; i < newExtensionPosList.length; i++) {
        let newPos = newExtensionPosList[i];
        if (newExtensionPosList.length < maxExtensionCount) {
            let tempPosList = [
                new RoomPosition(newPos.x+extensionDistance, newPos.y+extensionDistance, currentRoom.name),
                new RoomPosition(newPos.x-extensionDistance, newPos.y+extensionDistance, currentRoom.name),
                new RoomPosition(newPos.x+extensionDistance, newPos.y-extensionDistance, currentRoom.name),
                new RoomPosition(newPos.x-extensionDistance, newPos.y-extensionDistance, currentRoom.name),
            ]
            newExtensionPosList = newExtensionPosList.concat(tempPosList);
        }
        if (currentRoom.createConstructionSite(newPos, STRUCTURE_EXTENSION) == ERR_INVALID_TARGET) {
            newExtensionPosList.splice(i, 1);
        }
    }
}

module.exports.loop = function () {
    var mySpawn = Game.spawns['Spawn1'];    
    var myHarvesters = _.filter(Game.creeps, (creep) => creep.memory.role.toLowerCase() == 'harvester' );
    let harvesterWorkCount = 0;
    for (let ch of myHarvesters) {
        harvesterWorkCount += ch.body.filter(b => b.type == WORK).length;
    }
    var myCarriers = _.filter(Game.creeps, (creep) => creep.memory.role.toLowerCase() == 'carrier' );
    var myBuilders = _.filter(Game.creeps, (creep) => creep.memory.role.toLowerCase() == 'builder' );
    var myUpgraders = _.filter(Game.creeps, (creep) => creep.memory.role.toLowerCase() == 'upgrader' );
    var myRepairers = _.filter(Game.creeps, (creep) => creep.memory.role.toLowerCase() == 'repairer' );

    let newRole = myCarriers.length < myHarvesters.length ? 'carrier' :
        myHarvesters.length < 2 ? 'harvester' : '';
    if (newRole.length < 1 && mySpawn.room.energyAvailable >= mySpawn.room.energyCapacityAvailable) {
        newRole = myCarriers.length < myHarvesters.length || myCarriers.length < myUpgraders.length ? 'carrier' :
        myHarvesters.length < 3 && harvesterWorkCount < maxHarvesterWorkCount ? 'harvester' : 
        myBuilders.length < 2 ? 'builder' : 
        myUpgraders.length < 2 ? 'upgrader' :
        myRepairers.length < 1 ? 'repairer' : '';
    }
        
    if (newRole.length > 1) {
        console.log('Harvesters: ' + myHarvesters.length 
                + ' / Carriers: ' + myCarriers.length 
                + ' / Upgraders: ' + myUpgraders.length 
                + ' / Builders: ' + myBuilders.length
                + ' / Repairers: ' + myRepairers.length);
        console.log('Need new ' + newRole + '...');
        console.log('Energy: ' + mySpawn.room.energyAvailable + '/' + mySpawn.room.energyCapacityAvailable);
        let creepBodyParts = [MOVE];
        let isSpawnReady = false;
        switch (newRole) {
            case 'harvester':
                for (let partCost = 150; partCost < mySpawn.room.energyAvailable; partCost += 100) {
                    creepBodyParts = creepBodyParts.concat([WORK]);
                    isSpawnReady = true;
                }
                break;
            case 'builder':
            case 'upgrader':
                creepBodyParts = creepBodyParts.concat([CARRY]);
                for (let partCost = 200; partCost < mySpawn.room.energyAvailable; partCost += 100) {
                    creepBodyParts = creepBodyParts.concat([WORK]);
                    isSpawnReady = true;
                }
                break;
            case 'carrier':
                creepBodyParts = creepBodyParts.concat([CARRY]);
                isSpawnReady = mySpawn.room.energyAvailable >= 100 ? true : false;
                for (let partCost = 200; partCost < mySpawn.room.energyAvailable; partCost += 100) {
                    creepBodyParts = creepBodyParts.concat([MOVE]);
                    creepBodyParts = creepBodyParts.concat([CARRY]);
                }
                break;
            case 'repairer':
                creepBodyParts = creepBodyParts.concat([CARRY,WORK]);
                isSpawnReady = mySpawn.room.energyAvailable >= 200 ? true : false;
                for (let partCost = 400; partCost < mySpawn.room.energyAvailable; partCost += 200) {
                    creepBodyParts = creepBodyParts.concat([MOVE]);
                    creepBodyParts = creepBodyParts.concat([CARRY]);
                    creepBodyParts = creepBodyParts.concat([WORK]);
                }
                break;
        }
        if (isSpawnReady) {
            console.log('spawning new ' + newRole + ' with ' + creepBodyParts + '...');
            mySpawn.spawnCreep(
                creepBodyParts, 
                newRole+Game.time, 
                {memory: {role: newRole}});
        }
    }

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role.toLowerCase() == 'harvester') {
            roleHarvester.run(creep);
        }
        if(creep.memory.role.toLowerCase() == 'carrier') {
            roleCarrier.run(creep);
        }
        if(creep.memory.role.toLowerCase() == 'upgrader') {
            roleUpgrader.run(creep);
        }
        if(creep.memory.role.toLowerCase() == 'builder') {
            roleBuilder.run(creep);
        }
        if(creep.memory.role.toLowerCase() == 'repairer') {
            roleRepairer.run(creep);
        }
    }
}
