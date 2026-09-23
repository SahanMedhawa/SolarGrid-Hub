package com.smartsolar.microgrid.models;

public class MicrogridNode {
    private String id;
    private String nodeName;
    private String location;
    private double latitude;
    private double longitude;
    private double capacityKWh;
    private int batterySlots;
    private int availableBatterySlots;
    private String schedule;
    private boolean isActive;

    public MicrogridNode() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNodeName() { return nodeName; }
    public void setNodeName(String nodeName) { this.nodeName = nodeName; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }

    public double getCapacityKWh() { return capacityKWh; }
    public void setCapacityKWh(double capacityKWh) { this.capacityKWh = capacityKWh; }

    public int getBatterySlots() { return batterySlots; }
    public void setBatterySlots(int batterySlots) { this.batterySlots = batterySlots; }

    public int getAvailableBatterySlots() { return availableBatterySlots; }
    public void setAvailableBatterySlots(int availableBatterySlots) { this.availableBatterySlots = availableBatterySlots; }

    public String getSchedule() { return schedule; }
    public void setSchedule(String schedule) { this.schedule = schedule; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
