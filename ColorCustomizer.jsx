import React, { useState, useEffect, useCallback, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'

const DEFAULT_COLORS = {
  color1: '#FFF5EB',
  color2: '#d4af37',
  color3: '#FFD9C4'
}

export default function ColorCustomizer({ supabase, onColorChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [colors, setColors] = useState(DEFAULT_COLORS)
  const [saveStatus, setSaveStatus] = useState('Loading colors...')
  const [tableExists, setTableExists] = useState(true)

  const saveTimeoutRef = useRef(null)
  const isInitialMount = useRef(true)

  // Fetch colors on mount
  useEffect(() => {
    async function loadColors() {
      try {
        setSaveStatus('Loading settings...')
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle()

        if (error) {
          // If the table doesn't exist, we'll get a relation error
          if (error.code === '42P01') {
            console.warn('Supabase table "site_settings" not found. Falling back to defaults. Please make sure to run the SQL migration script in Supabase.')
            setTableExists(false)
            setSaveStatus('Local preview mode (table not found)')
          } else {
            console.error('Error fetching site settings:', error)
            setSaveStatus('Error loading colors')
          }
          onColorChange(DEFAULT_COLORS)
          return
        }

        if (data) {
          const fetchedColors = {
            color1: data.gradient_color1 || DEFAULT_COLORS.color1,
            color2: data.gradient_color2 || DEFAULT_COLORS.color2,
            color3: data.gradient_color3 || DEFAULT_COLORS.color3
          }
          setColors(fetchedColors)
          onColorChange(fetchedColors)
          setSaveStatus('Settings loaded')
        } else {
          // No settings row found, use defaults
          onColorChange(DEFAULT_COLORS)
          setSaveStatus('Using default settings')
        }
      } catch (err) {
        console.error('Failed to load colors:', err)
        setSaveStatus('Error loading colors')
        onColorChange(DEFAULT_COLORS)
      } finally {
        isInitialMount.current = false
      }
    }

    loadColors()
  }, [supabase, onColorChange])

  // Save to Supabase (debounced)
  const saveColors = useCallback(
    async (updatedColors) => {
      if (!tableExists) {
        setSaveStatus('Live preview active (table not created)')
        return
      }

      try {
        setSaveStatus('Saving settings...')
        const { error } = await supabase
          .from('site_settings')
          .upsert({
            id: 1,
            gradient_color1: updatedColors.color1,
            gradient_color2: updatedColors.color2,
            gradient_color3: updatedColors.color3
          })

        if (error) {
          console.error('Error saving colors:', error)
          setSaveStatus('Error saving changes')
        } else {
          setSaveStatus('All changes saved to Supabase')
        }
      } catch (err) {
        console.error('Failed to save colors:', err)
        setSaveStatus('Error saving changes')
      }
    },
    [supabase, tableExists]
  )

  // Handle color change from picker
  const handleColorChange = (key, val) => {
    const updated = { ...colors, [key]: val }
    setColors(updated)
    
    // Live update background WebGL
    onColorChange(updated)

    // Debounce save (500ms)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (!isInitialMount.current) {
      setSaveStatus('Typing...')
      saveTimeoutRef.current = setTimeout(() => {
        saveColors(updated)
      }, 500)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <>
      <button 
        className="btn btn-outline color-customizer-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title="Customize Background Colors"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <span>🎨 Colors</span>
      </button>

      <div className={`color-picker-panel ${isOpen ? 'open' : ''}`}>
        <div className="color-picker-header">
          <h3>Background Colors</h3>
          <button className="color-picker-close" onClick={() => setIsOpen(false)}>&times;</button>
        </div>

        <div className="color-picker-section">
          <div className="color-picker-label">
            <span>Color 1 (Highlight)</span>
            <span className="color-hex-value">{colors.color1}</span>
          </div>
          <HexColorPicker 
            color={colors.color1} 
            onChange={(val) => handleColorChange('color1', val)} 
          />
        </div>

        <div className="color-picker-section">
          <div className="color-picker-label">
            <span>Color 2 (Accent)</span>
            <span className="color-hex-value">{colors.color2}</span>
          </div>
          <HexColorPicker 
            color={colors.color2} 
            onChange={(val) => handleColorChange('color2', val)} 
          />
        </div>

        <div className="color-picker-section">
          <div className="color-picker-label">
            <span>Color 3 (Base)</span>
            <span className="color-hex-value">{colors.color3}</span>
          </div>
          <HexColorPicker 
            color={colors.color3} 
            onChange={(val) => handleColorChange('color3', val)} 
          />
        </div>

        <div className="color-picker-save-status">
          {saveStatus}
        </div>
      </div>
    </>
  )
}
