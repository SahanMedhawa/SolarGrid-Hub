package com.smartsolar.microgrid.models;

public class Reservation {
    private String id;
    private String prosumerNic;
    private String slotId;
    private String nodeId;
    private String reservationDate;
    private double energyKWh;
    private String status;
    private String qrCodeData;

    public Reservation() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProsumerNic() { return prosumerNic; }
    public void setProsumerNic(String prosumerNic) { this.prosumerNic = prosumerNic; }

    public String getSlotId() { return slotId; }
    public void setSlotId(String slotId) { this.slotId = slotId; }

    public String getNodeId() { return nodeId; }
    public void setNodeId(String nodeId) { this.nodeId = nodeId; }

    public String getReservationDate() { return reservationDate; }
    public void setReservationDate(String reservationDate) { this.reservationDate = reservationDate; }

    public double getEnergyKWh() { return energyKWh; }
    public void setEnergyKWh(double energyKWh) { this.energyKWh = energyKWh; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }
}
