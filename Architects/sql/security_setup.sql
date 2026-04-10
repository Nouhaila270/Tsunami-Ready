CREATE OR REPLACE FUNCTION trigger_tsunami_alert()
RETURNS TRIGGER AS $$
DECLARE
    v_alert_id INT;
    v_zones_affected INT;
BEGIN
    IF NEW.magnitude < 0 OR NEW.magnitude > 10 THEN
        RAISE EXCEPTION 'Magnitude invalide: %. Événement ignoré.', NEW.magnitude;
    END IF;

    IF NEW.latitude < 29.0 OR NEW.latitude > 31.5
       OR NEW.longitude < -10.0 OR NEW.longitude > -7.5 THEN
        RAISE EXCEPTION 'Coordonnées hors zone Souss-Massa. Événement ignoré.';
    END IF;

    IF NEW.magnitude >= 6.5 THEN
        UPDATE siren_zones
        SET status = 'ACTIVE', activated_at = NOW(), triggered_by_event = NEW.id
        WHERE coastal = TRUE AND status = 'STANDBY';

        GET DIAGNOSTICS v_zones_affected = ROW_COUNT;

        INSERT INTO tsunami_alerts (
            seismic_event_id, magnitude, alert_level, zones_activated,
            triggered_at, response_time_ms
        ) VALUES (
            NEW.id, NEW.magnitude, 'CRITICAL', v_zones_affected,
            NOW(), EXTRACT(MILLISECONDS FROM (NOW() - NEW.detected_at))
        ) RETURNING id INTO v_alert_id;

        RAISE NOTICE 'ALERTE TSUNAMI DÉCLENCHÉE – Magnitude: %, Zones: %, Alert ID: %',
            NEW.magnitude, v_zones_affected, v_alert_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_tsunami_threshold
    AFTER INSERT ON seismic_events
    FOR EACH ROW
    EXECUTE FUNCTION trigger_tsunami_alert();